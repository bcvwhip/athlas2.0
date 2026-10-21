import asyncio
import os
import sys

import edge_tts


async def main() -> None:
    if len(sys.argv) != 3:
        raise SystemExit('Usage: neuralTts.py <text> <output>')

    text, output_path = sys.argv[1], sys.argv[2]
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    communicate = edge_tts.Communicate(
        text,
        'it-IT-ElsaNeural',
        rate='-2%',
        pitch='+0Hz',
    )
    await communicate.save(output_path)


if __name__ == '__main__':
    asyncio.run(main())
