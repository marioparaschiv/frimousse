import json, sys
# Prints bench results side by side: python3 bench/summary.py a.json b.json ...
files = [json.load(open(f)) for f in sys.argv[1:]]
metrics = ['readyMs', 'framesToReady', 'blankFrames', 'maxBlankPx', 'scriptMs', 'taskMs']
print('scenario/metric'.ljust(28) + ''.join(f['label'][:14].rjust(15) for f in files))
for scenario in files[0]['summary']:
    for m in metrics:
        if m in files[0]['summary'][scenario]:
            print(f'{scenario}.{m}'.ljust(28) + ''.join(str(f['summary'][scenario].get(m, '-')).rjust(15) for f in files))
