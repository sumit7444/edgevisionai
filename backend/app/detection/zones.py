import json


def point_in_polygon(x, y, polygon):
    """Ray-casting point-in-polygon test. polygon is a list of [x, y] normalized points."""
    n = len(polygon)
    inside = False
    p1x, p1y = polygon[0]
    for i in range(1, n + 1):
        p2x, p2y = polygon[i % n]
        if y > min(p1y, p2y):
            if y <= max(p1y, p2y):
                if x <= max(p1x, p2x):
                    if p1y != p2y:
                        xinters = (y - p1y) * (p2x - p1x) / (p2y - p1y) + p1x
                    if p1x == p2x or x <= xinters:
                        inside = not inside
        p1x, p1y = p2x, p2y
    return inside


def check_zone_intrusions(person_detections, zones, frame_w, frame_h):
    """
    person_detections: list of detection dicts with bbox
    zones: list of Zone ORM rows (points is a JSON string)
    Returns list of (zone, detection) pairs that intrude.
    """
    intrusions = []
    for zone in zones:
        points = json.loads(zone.points)
        for det in person_detections:
            if det["class"] != "person":
                continue
            x1, y1, x2, y2 = det["bbox"]
            # use bottom-center of bbox (feet position) for ground-plane intrusion check
            cx = ((x1 + x2) / 2) / frame_w
            cy = y2 / frame_h
            if point_in_polygon(cx, cy, points):
                intrusions.append((zone, det))
    return intrusions
