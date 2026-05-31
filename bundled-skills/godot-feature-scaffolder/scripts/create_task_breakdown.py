#!/usr/bin/env python3
import argparse
from pathlib import Path

DEFAULT_TASKS = [
    'Design data contract',
    'Create scene skeleton',
    'Create script skeleton',
    'Wire input',
    'Add placeholder assets',
    'Integrate generated assets',
    'Test mobile',
    'Test desktop',
    'Polish and optimize'
]

def main():
    p = argparse.ArgumentParser(description='Create a task breakdown markdown file.')
    p.add_argument('--output', required=True)
    p.add_argument('--title', default='Feature Tasks')
    p.add_argument('--tasks', nargs='*', default=DEFAULT_TASKS)
    args = p.parse_args()
    out = Path(args.output)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text('# ' + args.title + '\n\n' + '\n'.join(f'- [ ] {t}' for t in args.tasks) + '\n')
    print(out)

if __name__ == '__main__':
    main()
