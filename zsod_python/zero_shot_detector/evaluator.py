"""zero_shot_detector/evaluator.py"""
from __future__ import annotations
from typing import List, Dict
import numpy as np


def _iou(a,b):
    ix1=max(a[0],b[0]);iy1=max(a[1],b[1]);ix2=min(a[2],b[2]);iy2=min(a[3],b[3])
    inter=max(0,ix2-ix1)*max(0,iy2-iy1)
    ua=(a[2]-a[0])*(a[3]-a[1])+(b[2]-b[0])*(b[3]-b[1])-inter
    return inter/ua if ua>0 else 0.0


class ZeroShotEvaluator:
    def evaluate_detections(self,gt,preds,iou_threshold=0.5):
        if not gt or not preds:
            return {"precision":0.0,"recall":0.0,"f1":0.0,"ap":0.0}
        preds_s=sorted(preds,key=lambda d:d.get("score",1.0),reverse=True)
        matched=set(); tp=0; fp=0
        prec=[]; rec=[]
        for p in preds_s:
            best_iou=0; best_i=-1
            for i,g in enumerate(gt):
                if i in matched: continue
                iou=_iou(p["box"],g["box"])
                if iou>best_iou and p.get("label","?")==g.get("label","?"):
                    best_iou=iou; best_i=i
            if best_iou>=iou_threshold and best_i>=0:
                tp+=1; matched.add(best_i)
            else:
                fp+=1
            prec.append(tp/(tp+fp)); rec.append(tp/len(gt))
        p_val=prec[-1] if prec else 0.0
        r_val=rec[-1]  if rec  else 0.0
        f1=2*p_val*r_val/(p_val+r_val) if p_val+r_val>0 else 0.0
        ap=float(np.mean(prec)) if prec else 0.0
        return {"precision":round(p_val,4),"recall":round(r_val,4),"f1":round(f1,4),"ap":round(ap,4)}

    def compute_coco_map_range(self,gt,preds):
        maps=[]
        for thr in np.arange(0.5,1.0,0.05):
            m=self.evaluate_detections(gt,preds,iou_threshold=float(thr))
            maps.append(m["ap"])
        return {"mAP_50_95":round(float(np.mean(maps)),4),"mAP_50":round(maps[0],4)}
