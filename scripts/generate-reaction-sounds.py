"""Original short, quiet UI cues. Standard library only; no external audio/license."""
import math
import struct
import wave
from pathlib import Path

output = Path(__file__).resolve().parents[1] / 'assets' / 'sounds'
output.mkdir(parents=True, exist_ok=True)
patterns = {'happy': [660, 880, 1100], 'angry': [170, 145], 'sad': [620, 440], 'confused': [580, 760]}
rate = 22050
for name, notes in patterns.items():
    data = []
    for frequency in notes:
        length = int(rate * .085)
        for i in range(length):
            envelope = math.sin(math.pi * i / length) ** 2
            sample = math.sin(2 * math.pi * frequency * i / rate) * envelope * .45
            data.append(struct.pack('<h', round(sample * 32767)))
    with wave.open(str(output / f'reaction-{name}.wav'), 'wb') as audio:
        audio.setparams((1, 2, rate, len(data), 'NONE', 'not compressed'))
        audio.writeframes(b''.join(data))
