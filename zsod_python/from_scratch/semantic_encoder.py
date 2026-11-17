"""
semantic_encoder.py – Semantic text encoder with pre-built word vectors.

Strategy (no external downloads needed)
----------------------------------------
1. We maintain a vocabulary of ~200 common visual concepts with
   hand-crafted 128-dim semantic embeddings derived from visual attributes
   (shape, colour, texture, context, size categories).
2. For unknown words we fall back to character n-gram hashing into the
   same 128-d space and blend with nearest-known-word cosine similarity.
3. This gives far more stable, semantically meaningful vectors than a
   randomly-initialised BiGRU.

The encoder is deterministic (no random weights exposed to the aligner)
so detection quality is consistent from the first run.
"""

from __future__ import annotations

import hashlib
import math
import re
from typing import List

import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F


# ---------------------------------------------------------------------------
# Attribute axes (each contributes structured signal to the embedding)
# ---------------------------------------------------------------------------

# Shape categories → dim 0-15
_SHAPES = {
    "round": 0, "circular": 0, "sphere": 0, "ball": 0,
    "square": 1, "rectangular": 1, "box": 1, "cube": 1,
    "elongated": 2, "long": 2, "rod": 2, "stick": 2,
    "flat": 3, "thin": 3, "sheet": 3, "plate": 3,
    "irregular": 4, "organic": 4, "blob": 4,
}

# Colour categories → dim 16-31
_COLOURS = {
    "red": 16, "crimson": 16, "scarlet": 16, "maroon": 16,
    "blue": 17, "navy": 17, "cobalt": 17, "cyan": 17, "teal": 17,
    "green": 18, "lime": 18, "olive": 18, "emerald": 18,
    "yellow": 19, "gold": 19, "amber": 19,
    "white": 20, "silver": 20, "light": 20, "pale": 20,
    "black": 21, "dark": 21, "shadow": 21,
    "brown": 22, "tan": 22, "beige": 22, "wooden": 22,
    "orange": 23, "pink": 24, "purple": 24, "violet": 24,
    "grey": 25, "gray": 25, "metallic": 25,
}

# Material / texture categories → dim 32-47
_MATERIALS = {
    "metal": 32, "steel": 32, "iron": 32, "aluminium": 32,
    "wood": 33, "wooden": 33, "timber": 33,
    "glass": 34, "transparent": 34, "crystal": 34,
    "plastic": 35, "rubber": 35, "synthetic": 35,
    "fabric": 36, "cloth": 36, "textile": 36, "cotton": 36, "leather": 36,
    "furry": 37, "hairy": 37, "fluffy": 37, "feather": 37,
    "stone": 38, "rock": 38, "concrete": 38,
    "paper": 39, "cardboard": 39,
    "food": 40, "fruit": 40, "vegetable": 40, "edible": 40,
    "liquid": 41, "water": 41, "fluid": 41,
}

# Context / location → dim 48-63
_CONTEXTS = {
    "indoor": 48, "inside": 48, "room": 48, "interior": 48,
    "outdoor": 49, "outside": 49, "street": 49, "road": 49, "park": 49,
    "kitchen": 50, "cooking": 50, "food": 50,
    "office": 51, "desk": 51, "work": 51,
    "vehicle": 52, "transport": 52, "road": 52,
    "nature": 53, "animal": 53, "wildlife": 53,
    "sky": 54, "air": 54, "cloud": 54,
    "water": 55, "ocean": 55, "lake": 55, "river": 55,
}

# Size categories → dim 64-71
_SIZES = {
    "tiny": 64, "small": 64, "mini": 64, "micro": 64,
    "medium": 65, "regular": 65, "normal": 65,
    "large": 66, "big": 66, "huge": 66, "giant": 66,
}

# Specific visual concept vocabulary (high-signal anchors) → dim 72-127
# Each concept gets 2 dimensions for identity + category signal
_CONCEPTS: dict[str, tuple[int, int]] = {
    # People & body
    "person": (72, 73), "human": (72, 73), "man": (72, 73), "woman": (72, 73),
    "face": (74, 75), "head": (74, 75), "eye": (74, 75), "hand": (74, 75),
    # Animals
    "dog": (76, 77), "cat": (76, 78), "bird": (76, 79),
    "horse": (76, 80), "cow": (76, 81), "elephant": (76, 82),
    # Vehicles
    "car": (84, 85), "truck": (84, 86), "bus": (84, 87),
    "bicycle": (84, 88), "motorcycle": (84, 89), "train": (84, 90),
    "airplane": (84, 91), "boat": (84, 92),
    # Furniture & indoor
    "chair": (94, 95), "sofa": (94, 96), "couch": (94, 96),
    "table": (94, 97), "desk": (94, 97), "bed": (94, 98),
    "shelf": (94, 99), "cabinet": (94, 99),
    # Electronics
    "laptop": (100, 101), "computer": (100, 101), "screen": (100, 101),
    "phone": (100, 102), "smartphone": (100, 102),
    "keyboard": (100, 103), "mouse": (100, 103),
    "tv": (100, 104), "monitor": (100, 104), "television": (100, 104),
    "camera": (100, 105),
    # Kitchen & food
    "mug": (106, 107), "cup": (106, 107), "glass": (106, 108),
    "bottle": (106, 109), "bowl": (106, 110),
    "pot": (106, 111), "pan": (106, 111),
    "knife": (106, 112), "fork": (106, 113), "spoon": (106, 113),
    "food": (106, 114), "fruit": (106, 115), "vegetable": (106, 115),
    "apple": (106, 116), "banana": (106, 116), "orange": (106, 116),
    # Outdoor & nature
    "tree": (118, 119), "plant": (118, 119), "flower": (118, 120),
    "grass": (118, 121), "sky": (118, 122), "cloud": (118, 122),
    "road": (118, 123), "building": (118, 124), "house": (118, 124),
    "traffic light": (118, 125), "sign": (118, 125),
    # Other common
    "book": (126, 127), "notebook": (126, 127), "pen": (126, 127),
    "bag": (126, 127), "backpack": (126, 127),
    "frisbee": (126, 127), "ball": (126, 127), "toy": (126, 127),
    "lamp": (126, 127), "light": (126, 127),
    "pillow": (126, 127), "blanket": (126, 127),
    "collar": (76, 77), "leash": (76, 77),
}


# ---------------------------------------------------------------------------
# Build the concept-embedding matrix
# ---------------------------------------------------------------------------

_EMBED_DIM = 128


def _build_concept_embeddings() -> dict[str, np.ndarray]:
    """Create semantically structured 128-d vectors for all known concepts."""
    result: dict[str, np.ndarray] = {}

    # Collect all tokens
    all_tokens: set[str] = set()
    for d in [_SHAPES, _COLOURS, _MATERIALS, _CONTEXTS, _SIZES]:
        all_tokens.update(d.keys())
    all_tokens.update(_CONCEPTS.keys())

    for token in all_tokens:
        vec = np.zeros(_EMBED_DIM, dtype=np.float32)

        # Shape signal
        for kw, dim in _SHAPES.items():
            if kw in token or token in kw:
                vec[dim] += 0.8

        # Colour signal
        for kw, dim in _COLOURS.items():
            if kw in token or token in kw:
                vec[dim] += 0.8

        # Material signal
        for kw, dim in _MATERIALS.items():
            if kw in token or token in kw:
                vec[dim] += 0.6

        # Context signal
        for kw, dim in _CONTEXTS.items():
            if kw in token or token in kw:
                vec[dim] += 0.6

        # Size signal
        for kw, dim in _SIZES.items():
            if kw in token or token in kw:
                vec[dim] += 0.5

        # Concept identity signal (strongest)
        for concept, (d1, d2) in _CONCEPTS.items():
            if concept == token or concept in token or token in concept:
                vec[d1] += 1.0
                vec[d2] += 1.0

        # Character n-gram hash fingerprint (dims 0-63 partial blending)
        ngram_vec = _char_ngram_vec(token, dim=64)
        vec[:64] += ngram_vec * 0.3

        norm = np.linalg.norm(vec)
        if norm > 1e-6:
            vec /= norm
        result[token] = vec

    return result


def _char_ngram_vec(text: str, dim: int = 64) -> np.ndarray:
    """Hash character bi-grams and tri-grams into a fixed-dim vector."""
    text = text.lower().strip()
    vec = np.zeros(dim, dtype=np.float32)
    ngrams = []
    for n in [2, 3]:
        padded = f"#{text}#"
        for i in range(len(padded) - n + 1):
            ngrams.append(padded[i:i+n])
    for ng in ngrams:
        h = int(hashlib.md5(ng.encode()).hexdigest(), 16) % dim
        vec[h] += 1.0
    norm = np.linalg.norm(vec)
    if norm > 1e-6:
        vec /= norm
    return vec


# Pre-build the concept library once at import time
_CONCEPT_LIB: dict[str, np.ndarray] = _build_concept_embeddings()


# ---------------------------------------------------------------------------
# Semantic encoder module
# ---------------------------------------------------------------------------

class ScratchSemanticEncoder(nn.Module):
    """
    Deterministic semantic text encoder.

    Converts text query strings → L2-normalised 128-d vectors using:
    1. Direct lookup in pre-built concept vocabulary (highest quality).
    2. Word-by-word decomposition + aggregation for multi-word queries.
    3. Character n-gram hashing as fallback for truly unknown words.

    No random weights → consistent, meaningful distances between concepts.

    Parameters
    ----------
    semantic_dim : int  Output embedding dimension (must be 128).
    """

    def __init__(self, semantic_dim: int = 128) -> None:
        super().__init__()
        self.semantic_dim = semantic_dim
        assert semantic_dim == _EMBED_DIM, \
            f"ScratchSemanticEncoder only supports semantic_dim={_EMBED_DIM}"

        # Store concept lib as a buffer for device consistency
        # (we keep it as a dict on CPU; lookup is cheap)
        self._lib = _CONCEPT_LIB

        # Lightweight learnable refinement: just a scale + bias per dim
        # so the model can still fine-tune signal strengths
        self.scale = nn.Parameter(torch.ones(semantic_dim))
        self.bias  = nn.Parameter(torch.zeros(semantic_dim))

    # ------------------------------------------------------------------
    # Encode a single phrase
    # ------------------------------------------------------------------

    def _encode_phrase(self, phrase: str) -> np.ndarray:
        """Encode a single text phrase to a 128-d numpy vector."""
        phrase_clean = phrase.lower().strip()

        # 1. Try direct lookup (exact match)
        if phrase_clean in self._lib:
            return self._lib[phrase_clean].copy()

        # 2. Try word-by-word aggregation
        words = re.split(r"[\s_\-]+", phrase_clean)
        word_vecs = []
        for w in words:
            if w in self._lib:
                word_vecs.append(self._lib[w])
            else:
                # Find closest concept via character similarity
                best_sim, best_vec = -1.0, None
                w_ng = _char_ngram_vec(w, dim=64)
                for concept, cvec in self._lib.items():
                    # character-level overlap heuristic
                    if w in concept or concept in w:
                        sim = sum(1 for c in w if c in concept) / max(len(w), 1)
                        if sim > best_sim:
                            best_sim = sim
                            best_vec = cvec
                if best_vec is not None and best_sim > 0.3:
                    word_vecs.append(best_vec)
                else:
                    # Pure n-gram hash
                    h = np.zeros(_EMBED_DIM, dtype=np.float32)
                    h[:64] = _char_ngram_vec(w, dim=64)
                    word_vecs.append(h)

        if word_vecs:
            vec = np.mean(word_vecs, axis=0).astype(np.float32)
        else:
            vec = _char_ngram_vec(phrase_clean, dim=_EMBED_DIM)

        norm = np.linalg.norm(vec)
        if norm > 1e-6:
            vec /= norm
        return vec

    # ------------------------------------------------------------------
    # Forward
    # ------------------------------------------------------------------

    def forward(self, query_list: List[str]) -> torch.Tensor:
        """
        Encode a list of text queries.

        Parameters
        ----------
        query_list : List[str]

        Returns
        -------
        torch.Tensor  shape (N, semantic_dim), L2-normalised
        """
        vecs = [self._encode_phrase(q) for q in query_list]
        mat = torch.from_numpy(np.stack(vecs, axis=0))  # (N, 128)

        # Apply learnable scale + bias refinement
        mat = mat * self.scale.cpu() + self.bias.cpu()

        # Final L2 normalise
        return F.normalize(mat, p=2, dim=-1)
