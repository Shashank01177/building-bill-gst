"""
semantic_encoder.py - Structured semantic word embeddings (no random weights).
Concepts mapped to meaningful 128-d vectors using visual attribute axes.
"""
import hashlib, re, numpy as np, torch, torch.nn as nn, torch.nn.functional as F
from typing import List

DIM = 128

# concept → (dim_a, dim_b) identity dimensions
CONCEPTS = {
    "person":(0,1),"human":(0,1),"man":(0,1),"woman":(0,1),"people":(0,1),
    "face":(2,3),"head":(2,3),"eye":(2,3),"hand":(2,3),"body":(2,3),
    "dog":(4,5),"cat":(4,6),"bird":(4,7),"horse":(4,8),"animal":(4,9),
    "car":(10,11),"vehicle":(10,11),"truck":(10,12),"bus":(10,13),
    "bicycle":(10,14),"motorcycle":(10,15),"train":(10,16),"boat":(10,17),
    "chair":(20,21),"sofa":(20,22),"couch":(20,22),"table":(20,23),
    "desk":(20,23),"bed":(20,24),"shelf":(20,25),"cabinet":(20,25),
    "laptop":(30,31),"computer":(30,31),"screen":(30,31),"monitor":(30,31),
    "phone":(30,32),"smartphone":(30,32),"keyboard":(30,33),"mouse":(30,33),
    "tv":(30,34),"television":(30,34),"camera":(30,35),
    "mug":(40,41),"cup":(40,41),"bottle":(40,42),"bowl":(40,43),
    "pot":(40,44),"pan":(40,44),"knife":(40,45),"fork":(40,46),
    "food":(40,47),"fruit":(40,48),"apple":(40,48),"banana":(40,48),
    "tree":(50,51),"plant":(50,51),"flower":(50,52),"grass":(50,53),
    "sky":(50,54),"cloud":(50,54),"road":(50,55),"building":(50,56),
    "traffic light":(50,57),"sign":(50,57),"window":(50,58),"door":(50,58),
    "book":(60,61),"notebook":(60,61),"pen":(60,62),"pencil":(60,62),
    "bag":(60,63),"backpack":(60,63),"lamp":(60,64),"pillow":(60,65),
    "frisbee":(60,66),"ball":(60,66),"collar":(4,5),"fur":(4,9),
}
COLOURS = {"red":70,"blue":71,"green":72,"yellow":73,"white":74,
           "black":75,"brown":76,"orange":77,"pink":78,"purple":79,"grey":80,"gray":80}
SIZES   = {"small":90,"tiny":90,"large":91,"big":91,"huge":91}


def _vec(token: str) -> np.ndarray:
    v = np.zeros(DIM, dtype=np.float32)
    t = token.lower().strip()
    # exact concept
    for concept,(a,b) in CONCEPTS.items():
        if concept == t or concept in t or t in concept:
            v[a] += 1.0; v[b] += 1.0
    # colour
    for c,d in COLOURS.items():
        if c in t: v[d] += 0.8
    # size
    for s,d in SIZES.items():
        if s in t: v[d] += 0.5
    # n-gram fingerprint (dims 100-127)
    ng = []
    p = f"#{t}#"
    for n in [2,3]:
        for i in range(len(p)-n+1):
            ng.append(p[i:i+n])
    for g in ng:
        h = int(hashlib.md5(g.encode()).hexdigest(),16) % 28
        v[100+h] += 1.0
    norm = np.linalg.norm(v)
    return v / norm if norm > 1e-6 else v


class ScratchSemanticEncoder(nn.Module):
    def __init__(self, semantic_dim=128):
        super().__init__()
        assert semantic_dim == DIM
        self.semantic_dim = DIM
        self.scale = nn.Parameter(torch.ones(DIM))
        self.bias  = nn.Parameter(torch.zeros(DIM))

    def forward(self, query_list: List[str]) -> torch.Tensor:
        vecs = []
        for q in query_list:
            words = re.split(r"[\s,_]+", q.lower().strip())
            wv = [_vec(w) for w in words if w]
            v = np.mean(wv, axis=0) if wv else _vec(q)
            norm = np.linalg.norm(v)
            vecs.append(v / norm if norm > 1e-6 else v)
        mat = torch.from_numpy(np.stack(vecs))
        mat = mat * self.scale.detach().cpu() + self.bias.detach().cpu()
        return F.normalize(mat, p=2, dim=-1)
