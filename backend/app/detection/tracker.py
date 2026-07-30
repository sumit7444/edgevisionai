"""
A deliberately simple IoU-based tracker — assigns short-lived worker IDs to
person detections across consecutive frames of one camera stream.

This is NOT re-identification: IDs only persist for as long as a person stays
continuously tracked in-frame (a few seconds of missed detection before the ID
is dropped). If someone leaves frame and comes back, they get a new ID. Good
enough for a live "who's currently on site and are they compliant" view;
not a substitute for a real ReID model if you need identity persistence across
long absences or multiple cameras.
"""
import time
import uuid


def iou(box_a, box_b):
    ax1, ay1, ax2, ay2 = box_a
    bx1, by1, bx2, by2 = box_b
    ix1, iy1 = max(ax1, bx1), max(ay1, by1)
    ix2, iy2 = min(ax2, bx2), min(ay2, by2)
    iw, ih = max(0, ix2 - ix1), max(0, iy2 - iy1)
    inter = iw * ih
    area_a = max(0, ax2 - ax1) * max(0, ay2 - ay1)
    area_b = max(0, bx2 - bx1) * max(0, by2 - by1)
    union = area_a + area_b - inter
    return inter / union if union > 0 else 0.0


class Track:
    def __init__(self, track_id, bbox):
        self.id = track_id
        self.bbox = bbox
        self.last_seen = time.time()
        self.first_seen = time.time()
        self.compliant = True

    def touch(self, bbox, compliant):
        self.bbox = bbox
        self.last_seen = time.time()
        self.compliant = compliant


class WorkerTracker:
    def __init__(self, iou_threshold=0.3, max_age_seconds=3.0):
        self.tracks = {}
        self.iou_threshold = iou_threshold
        self.max_age_seconds = max_age_seconds

    def update(self, person_boxes, violation_person_indices):
        """
        person_boxes: list of [x1,y1,x2,y2] for this frame's person detections
        violation_person_indices: set of indices into person_boxes currently in violation
        Returns list of {id, bbox, compliant, duration_seconds} for active tracks.
        """
        now = time.time()
        unmatched = list(range(len(person_boxes)))
        matched_track_ids = set()

        # greedy match each existing track to the best-overlapping detection
        for track_id, track in list(self.tracks.items()):
            best_idx, best_score = None, 0.0
            for idx in unmatched:
                score = iou(track.bbox, person_boxes[idx])
                if score > best_score:
                    best_score, best_idx = score, idx
            if best_idx is not None and best_score >= self.iou_threshold:
                compliant = best_idx not in violation_person_indices
                track.touch(person_boxes[best_idx], compliant)
                matched_track_ids.add(track_id)
                unmatched.remove(best_idx)

        # drop stale tracks
        for track_id, track in list(self.tracks.items()):
            if now - track.last_seen > self.max_age_seconds:
                del self.tracks[track_id]

        # new tracks for unmatched detections
        for idx in unmatched:
            new_id = f"W-{str(uuid.uuid4())[:4].upper()}"
            compliant = idx not in violation_person_indices
            self.tracks[new_id] = Track(new_id, person_boxes[idx])
            self.tracks[new_id].compliant = compliant

        return [
            {
                "id": t.id,
                "bbox": t.bbox,
                "compliant": t.compliant,
                "duration_seconds": round(now - t.first_seen, 1),
            }
            for t in self.tracks.values()
        ]
