import glob,os,subprocess,textwrap
exec(open('film/make_text.py').read().split("Path('film/captions.srt')")[0])
files=sorted(glob.glob('film/raw/*.webm'),key=os.path.getsize,reverse=True)
phone,desk=files[:2]
print('phone',phone,'desktop',desk,flush=True)
# Every entry is output duration, source, source start, source end. Segments stretch time for reading.
segments=[(12,None,0,0),(11,1,0,10),(12,0,20,30),(12,0,35,53),(12,0,53,65),(12,0,65,71),(12,0,72,86),(13,0,87,99),(12,1,15,20),(13,0,55,65),(12,1,27,34),(12,1,8,15),(12,1,20,27),(11,None,0,0)]
f=[]
for i,(dur,src,a,b) in enumerate(segments):
 if src is None:
  if i==0: title="Halte"; sub="STOLEN WATCHES, UNSELLABLE."
  else: title="Stolen watches, unsellable."; sub="halte-roan.vercel.app   |   github.com/emmaGH1/halte"
  f.append(f"color=c=0x07070A:s=1920x1080:r=24:d={dur},drawbox=x=130:y=265:w=12:h=300:color=0xFF4526:t=fill[v{i}]")
 else:
  size='crop=390:844:0:0,scale=-2:820' if src==0 else 'crop=1440:900:0:0,scale=1440:900'
  # Keep footage above captions, on the specified dark background.
  f.append(f'[{src}:v]trim=start={a}:end={b},setpts=(PTS-STARTPTS)*{dur/(b-a)},fps=24,{size},pad=1920:1080:(ow-iw)/2:40:color=0x07070A,setsar=1[v{i}]')
f.append(''.join(f'[v{i}]' for i in range(len(segments)))+f'concat=n={len(segments)}:v=1:a=0,subtitles=film/captions.ass[out]')
open('film/filter.txt','w').write(';\n'.join(f))
def ts(t):return f'{t//3600}:{t%3600//60:02}:{t%60:02}.00'
ass='''[Script Info]\nScriptType: v4.00+\nPlayResX: 1920\nPlayResY: 1080\nWrapStyle: 0\n[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\nStyle: Default,DejaVu Sans,37,&H00FFFFFF,&H000000FF,&H00070707,&HCC070707,0,0,0,0,100,100,0,0,3,12,0,2,180,180,45,1\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n'''
for a,b,s in beats: ass+=f'Dialogue: 0,{ts(a)},{ts(b)},Default,,0,0,0,,'+r'\N'.join(textwrap.wrap(s,75))+'\n'
ass += r"Dialogue: 1,0:00:00.00,0:00:12.00,Default,,0,0,0,,{\an7\pos(190,330)\fs90\b1}Halte\N{\fs32\c&H2645FF&}STOLEN WATCHES, UNSELLABLE."+"\n"
ass += r"Dialogue: 1,0:02:37.00,0:02:48.00,Default,,0,0,0,,{\an7\pos(190,330)\fs65\b1}Stolen watches, unsellable.\N{\fs32\c&H2645FF&}halte-roan.vercel.app  |  github.com/emmaGH1/halte"+"\n"
ass += r"Dialogue: 1,0:01:48.00,0:02:01.00,Default,,0,0,0,,{\an7\pos(80,70)\fs26\c&H2645FF&}QORECHAIN DIANA  /  ML-DSA-87  /  pqcVerify"+"\n"
ass += r"Dialogue: 1,0:02:01.00,0:02:13.00,Default,,0,0,0,,{\an7\pos(80,70)\fs24\c&H2645FF&}CONTRACT  0x900db566e46b6a68a7fd2f721b2ca6291f2ef3e4\NQCAI AUDIT  /  21 HARDHAT TESTS"+"\n"
open('film/captions.ass','w').write(ass)
cmd=['/data/home/.local/bin/ffmpeg','-y','-i',phone,'-i',desk,'-f','lavfi','-i','anullsrc=channel_layout=stereo:sample_rate=48000','-filter_complex_script','film/filter.txt','-map','[out]','-map','2:a','-t','168','-c:v','libx264','-preset','veryfast','-crf','23','-pix_fmt','yuv420p','-c:a','aac','-b:a','128k','-movflags','+faststart','film/halte-draft.mp4']
subprocess.run(cmd,check=True)
