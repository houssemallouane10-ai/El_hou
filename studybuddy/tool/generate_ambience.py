"""Synthesizes the focus-room ambience loops in assets/audio/.

Everything is generated from scratch (no samples), so the files carry no
third-party rights. Needs numpy and ffmpeg:

    python3 tool/generate_ambience.py
"""
import pathlib
import subprocess
import tempfile
import wave

import numpy as np

SR = 32000
OUT = pathlib.Path(__file__).resolve().parent.parent / "assets" / "audio"
rng = np.random.default_rng(1962)


def note(name):
    names = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}
    semis = names[name[0]] + (1 if "#" in name else 0)
    octave = int(name[-1])
    midi = 12 * (octave + 1) + semis
    return 440.0 * 2 ** ((midi - 69) / 12)


def env(n, attack, decay):
    t = np.arange(n) / SR
    a = np.clip(t / attack, 0, 1)
    return a * np.exp(-t / decay)


def keys(freq, dur):
    """A soft electric-piano tone: a few harmonics, slow decay, tremolo."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    tone = np.zeros(n)
    for h, amp in [(1, 1.0), (2, 0.35), (3, 0.12), (4, 0.05)]:
        detune = 1 + rng.normal(0, 0.0007)
        tone += amp * np.sin(2 * np.pi * freq * h * detune * t) * np.exp(-t * h * 0.5)
    tone *= 1 + 0.08 * np.sin(2 * np.pi * 4.5 * t)
    return tone * env(n, 0.01, 2.6)


def kick(dur=0.5):
    n = int(dur * SR)
    t = np.arange(n) / SR
    freq = 50 + 70 * np.exp(-t * 30)
    phase = 2 * np.pi * np.cumsum(freq) / SR
    return np.sin(phase) * env(n, 0.002, 0.16)


def snare(dur=0.3):
    n = int(dur * SR)
    noise = rng.normal(0, 1, n)
    noise = noise - np.convolve(noise, np.ones(8) / 8, mode="same")
    t = np.arange(n) / SR
    body = 0.4 * np.sin(2 * np.pi * 190 * t)
    return (0.5 * noise + body) * env(n, 0.001, 0.07)


def hat(dur=0.06):
    n = int(dur * SR)
    noise = rng.normal(0, 1, n)
    noise = noise - np.convolve(noise, np.ones(4) / 4, mode="same")
    return noise * env(n, 0.0005, 0.015)


def add(buf, sound, at, gain):
    i = int(at * SR)
    end = min(len(buf), i + len(sound))
    if i < len(buf):
        buf[i:end] += gain * sound[: end - i]


def lofi():
    bpm = 72
    beat = 60 / bpm
    bar = 4 * beat
    chords = [
        ["F3", "A3", "C4", "E4"],  # Fmaj7
        ["E3", "G3", "B3", "D4"],  # Em7
        ["D3", "F3", "A3", "C4"],  # Dm7
        ["C3", "E3", "G3", "B3"],  # Cmaj7
    ]
    bass = ["F2", "E2", "D2", "C2"]
    loop_bars = 8
    loop = loop_bars * bar
    # Render three loops and keep the middle one, so the tails that ring over
    # the loop point are already in the audio and the loop is seamless.
    buf = np.zeros(int(3 * loop * SR) + SR)
    swing = 0.06 * beat
    for rep in range(3):
        for b in range(loop_bars):
            start = rep * loop + b * bar
            chord = chords[b % 4]
            strum = 0.0
            for name in chord:
                add(buf, keys(note(name), bar * 1.1), start + strum, 0.26)
                strum += 0.018
            if b % 2 == 1:
                for name in chord[1:]:
                    add(buf, keys(note(name), beat * 1.5), start + 2.5 * beat, 0.07)
            add(buf, keys(note(bass[b % 4]), beat * 1.8), start, 0.35)
            add(buf, keys(note(bass[b % 4]), beat * 1.2), start + 2 * beat, 0.25)
            add(buf, kick(), start, 0.45)
            add(buf, kick(), start + 2.5 * beat, 0.3 if b % 2 else 0.0)
            add(buf, kick(), start + 2 * beat, 0.4)
            add(buf, snare(), start + beat, 0.22)
            add(buf, snare(), start + 3 * beat, 0.22)
            for e in range(8):
                at = start + e * beat / 2 + (swing if e % 2 else 0)
                add(buf, hat(), at, 0.10 if e % 2 else 0.14)
    # Vinyl: a quiet hiss and sparse crackles.
    buf += rng.normal(0, 0.004, len(buf))
    pops = rng.random(len(buf)) < 6 / SR
    buf += pops * rng.normal(0, 0.25, len(buf))
    return buf, loop


def write_wav(path, samples):
    samples = samples / max(1e-9, np.max(np.abs(samples))) * 0.9
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((samples * 32767).astype(np.int16).tobytes())


def encode(src, dst, filters, bitrate="80k"):
    subprocess.run(
        ["ffmpeg", "-y", "-loglevel", "error", "-i", str(src), "-af", filters,
         "-c:a", "aac", "-b:a", bitrate, "-ac", "1", str(dst)],
        check=True,
    )


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp:
        raw = pathlib.Path(tmp) / "lofi.wav"
        buf, loop = lofi()
        write_wav(raw, buf)
        encode(raw, OUT / "lofi.m4a",
               f"lowpass=f=3200,atrim=start={loop}:duration={loop},"
               "asetpts=PTS-STARTPTS,loudnorm=I=-20")

        noise = pathlib.Path(tmp) / "noise.wav"
        brown = np.cumsum(rng.normal(0, 1, 45 * SR))
        brown -= np.convolve(brown, np.ones(SR) / SR, mode="same")
        write_wav(noise, brown)
        encode(noise, OUT / "brown_noise.m4a",
               "highpass=f=30,lowpass=f=900,loudnorm=I=-24", bitrate="40k")
    for f in sorted(OUT.glob("*.m4a")):
        print(f.name, f.stat().st_size // 1024, "KiB")


if __name__ == "__main__":
    main()
