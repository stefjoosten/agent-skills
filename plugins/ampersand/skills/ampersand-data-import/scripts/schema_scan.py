#!/usr/bin/env python3
"""Exhaustively derive the schema of a directory of YAML/JSON data files.

    python3 schema_scan.py <dir> [--json]

For every key-path across ALL files, reports: occurrences, #files, value KINDS
(scalar/null/empty-list/list-of-scalar/list-of-object/object), scalar types, and
example values. Also reports the total scalar-leaf count (the denominator of
"100% of pairs") and, for any self-nesting key, the max recursion depth.

Design the model from THIS, never from a few samples. Needs pyyaml for .yml
(pip install pyyaml, in a venv if the system Python is externally managed).
"""
import sys, os, glob, json, collections

def load(path):
    if path.endswith(('.yml', '.yaml')):
        import yaml
        with open(path, encoding='utf-8') as f:
            return yaml.safe_load(f)
    with open(path, encoding='utf-8') as f:
        return json.load(f)

def kind_of(v):
    if v is None: return 'null'
    if isinstance(v, bool): return 'scalar'
    if isinstance(v, (int, float, str)): return 'scalar'
    if isinstance(v, list):
        if not v: return 'empty-list'
        if all(isinstance(x, (str, int, float, bool)) or x is None for x in v): return 'list-of-scalar'
        if all(isinstance(x, dict) for x in v): return 'list-of-object'
        return 'list-mixed'
    if isinstance(v, dict): return 'object'
    return 'other'

def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    root = sys.argv[1]
    paths = sorted(glob.glob(os.path.join(root, '**', '*.yml'), recursive=True)
                   + glob.glob(os.path.join(root, '**', '*.yaml'), recursive=True)
                   + glob.glob(os.path.join(root, '**', '*.json'), recursive=True))
    info = collections.defaultdict(lambda: {'files': set(), 'occ': 0, 'kinds': collections.Counter(),
                                            'types': collections.Counter(), 'ex': []})
    leaves = {}
    errors = []

    def walk(node, path, fname):
        rec = info[path]; k = kind_of(node)
        rec['files'].add(fname); rec['occ'] += 1; rec['kinds'][k] += 1
        if k == 'scalar':
            rec['types'][type(node).__name__] += 1
            if len(rec['ex']) < 3:
                s = str(node); rec['ex'].append(s[:60] + ('…' if len(s) > 60 else ''))
            return 1
        if k in ('null', 'empty-list'): return 0
        n = 0
        if isinstance(node, dict):
            for key, val in node.items(): n += walk(val, path + '.' + key, fname)
        elif isinstance(node, list):
            for it in node: n += walk(it, path + '[]', fname)
        return n

    for p in paths:
        f = os.path.relpath(p, root)
        try:
            leaves[f] = walk(load(p), '$', f)
        except Exception as e:
            errors.append((f, str(e)[:120]))

    print(f'files: {len(paths)}  parsed: {len(leaves)}  errors: {len(errors)}')
    for f, e in errors[:20]: print(f'  ERR {f}: {e}')
    print('\n== schema ==')
    for path in sorted(info):
        r = info[path]
        kinds = ','.join(f'{k}={c}' for k, c in r['kinds'].most_common())
        print(f'{path}\n    occ={r["occ"]} files={len(r["files"])}  [{kinds}]  ' + (' | '.join(r['ex'])))
    # recursion depth per self-nesting key (a path segment repeated)
    depths = {}
    for path in info:
        segs = [s for s in path.replace('[]', '').split('.') if s]
        for seg in set(segs):
            d = segs.count(seg)
            if d > 1: depths[seg] = max(depths.get(seg, 0), d)
    if depths:
        print('\n== self-nesting keys (max depth) ==')
        for k, d in sorted(depths.items(), key=lambda x: -x[1]): print(f'  {k}: depth {d}')
    tot = sum(leaves.values())
    print(f'\n== leaves ==  total scalar leaves: {tot}  '
          f'(min {min(leaves.values(), default=0)} / max {max(leaves.values(), default=0)} per file)')

if __name__ == '__main__':
    main()
