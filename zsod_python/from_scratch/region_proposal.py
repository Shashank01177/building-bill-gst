"""
region_proposal.py - Multi-scale anchor proposals with Sobel edge scoring.
"""
import numpy as np


class ScratchRegionProposalGenerator:
    def __init__(self, top_k=100):
        self.top_k = top_k

    def propose(self, np_image):
        H, W = np_image.shape[:2]
        gray = np_image.mean(axis=2) if np_image.ndim == 3 else np_image
        # Sobel gradients
        gy = np.diff(gray, axis=0, prepend=gray[:1])
        gx = np.diff(gray, axis=1, prepend=gray[:, :1])
        energy = np.abs(gx) + np.abs(gy)

        anchors, scores = [], []
        scales = [0.08, 0.15, 0.25, 0.4, 0.6]
        ratios = [0.5, 1.0, 2.0]
        steps = 6
        for s in scales:
            bw = int(W * s); bh_base = int(H * s)
            for r in ratios:
                bh = int(bh_base * r)
                bw2 = int(bw / r)
                if bw2 < 8 or bh < 8: continue
                xs = np.linspace(0, W - bw2, steps, dtype=int)
                ys = np.linspace(0, H - bh,  steps, dtype=int)
                for x1 in xs:
                    for y1 in ys:
                        x2 = min(W, x1 + bw2)
                        y2 = min(H, y1 + bh)
                        patch = energy[y1:y2, x1:x2]
                        sc = float(patch.mean()) if patch.size > 0 else 0.0
                        anchors.append([x1, y1, x2, y2])
                        scores.append(sc)

        if not anchors:
            return np.zeros((0, 4), dtype=np.float32)
        anchors = np.array(anchors, dtype=np.float32)
        scores  = np.array(scores,  dtype=np.float32)
        idx = np.argsort(scores)[::-1][:self.top_k]
        return anchors[idx]
