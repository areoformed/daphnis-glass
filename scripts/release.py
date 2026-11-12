#!/usr/bin/env python3
"""Fail-closed local release exporter. No publication or remote writes."""
import argparse,hashlib,json,os,re,shutil,subprocess,tarfile,tempfile,zipfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def digest(data):return hashlib.sha256(data).hexdigest()
def validate(deny_file=None):
    mapping=json.loads((ROOT/'release/public-files.json').read_text())
    allowed=set(mapping['source_files']);actual=set()
    for p in ROOT.rglob('*'):
        rel=p.relative_to(ROOT)
        if '.git' in rel.parts:continue
        if p.is_symlink():raise SystemExit(f'Refusing symbolic link: {rel}')
        if p.is_file():actual.add(rel.as_posix())
    generated={'MANIFEST.json','SHA256SUMS'}
    if actual-generated!=allowed:raise SystemExit(f'Unmapped/missing source files: {sorted((actual-generated)^allowed)}')
    if actual&generated:
        if actual&generated!=generated:raise SystemExit('Incomplete integrity files')
        manifest=json.loads((ROOT/'MANIFEST.json').read_text())
        expected={rel:digest((ROOT/rel).read_bytes()) for rel in sorted(allowed)}
        if manifest!=expected:raise SystemExit('Source integrity manifest does not match')
        sums=''.join(f'{expected[r]}  {r}\n' for r in sorted(expected))+f'{digest((ROOT/"MANIFEST.json").read_bytes())}  MANIFEST.json\n'
        if (ROOT/'SHA256SUMS').read_text()!=sums:raise SystemExit('Source checksum list does not match')
    forbidden=[chr(47)+r'(?:Users|home)'+chr(47)+r'[A-Za-z0-9._-]+'+chr(47),r'(?i)BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY',r'(?i)Authorization:\s*Bearer\s+[A-Za-z0-9_-]{20}',r'\b(?:sk-|ghp_|github_pat_)[A-Za-z0-9_]{20}']
    if deny_file:forbidden+=json.loads(deny_file.read_text())
    for rel in allowed:
        data=(ROOT/rel).read_text()
        for pattern in forbidden:
            if re.search(pattern,data):raise SystemExit(f'Private-content signature in {rel}')
    pkg=json.loads((ROOT/'package.json').read_text())
    if pkg.get('license')!='MIT' or pkg.get('dependencies') or pkg.get('devDependencies'):raise SystemExit('Unexpected license or dependencies')
    if not (ROOT/'LICENSE').read_text().startswith('MIT License'):raise SystemExit('MIT text missing')
    if 'in progress' in (ROOT/'VALIDATION.md').read_text():raise SystemExit('Release validation is incomplete')
    subprocess.run(['node','--test','tests/unit.mjs','tests/optics.mjs'],cwd=ROOT,check=True)
    return mapping,pkg,allowed

def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--check',action='store_true');parser.add_argument('--output',type=Path);parser.add_argument('--deny-file',type=Path,help='Optional private extra audit rules, kept outside the source tree');args=parser.parse_args()
    mapping,pkg,allowed=validate(args.deny_file)
    if not args.output:print(f'Validated {len(allowed)} explicit public source files.');return
    out=args.output.resolve()
    if out==ROOT or ROOT in out.parents:raise SystemExit('Release output must be outside the source tree')
    out.mkdir(parents=True,exist_ok=True)
    snapshot={rel:(ROOT/rel).read_bytes() for rel in sorted(allowed)}
    with tempfile.TemporaryDirectory(prefix='felt-glass-package-') as temp:
        env={**os.environ,'npm_config_cache':str(Path(temp)/'npm-cache')}
        result=subprocess.run(['npm','pack','--ignore-scripts','--json','--pack-destination',temp],cwd=ROOT,env=env,check=True,capture_output=True,text=True)
        packed=json.loads(result.stdout)[0];archive=Path(temp)/packed['filename']
        with tarfile.open(archive) as tar:
            members=tar.getmembers()
            if any(not m.isfile() for m in members):raise SystemExit('npm archive contains links or non-file entries')
            names={m.name.removeprefix('package/') for m in members}
            if len(names)!=len(members):raise SystemExit('Duplicate npm archive entries')
            for member in members:
                if tar.extractfile(member).read()!=snapshot[member.name.removeprefix('package/')]:raise SystemExit('npm bytes differ from approved source')
            if names!=set(mapping['npm_files']):raise SystemExit(f'Unexpected npm membership: {sorted(names^set(mapping["npm_files"]))}')
        if any((ROOT/rel).read_bytes()!=data for rel,data in snapshot.items()):raise SystemExit('Source changed while packaging')
        target=out/archive.name;shutil.copyfile(archive,target)
    version=pkg['version'];stem='felt-glass-'+version
    manifest={rel:digest(data) for rel,data in snapshot.items()}
    extra={'MANIFEST.json':(json.dumps(manifest,indent=2)+'\n').encode()}
    extra['SHA256SUMS']=(''.join(f'{manifest[p]}  {p}\n' for p in sorted(manifest))+f'{digest(extra["MANIFEST.json"])}  MANIFEST.json\n').encode()
    bundle=out/(stem+'.zip')
    with zipfile.ZipFile(bundle,'w',zipfile.ZIP_DEFLATED,compresslevel=9) as archive:
        for rel in sorted(allowed):
            info=zipfile.ZipInfo(stem+'/'+rel,(2026,11,11,0,0,0));info.external_attr=0o100644<<16;info.compress_type=zipfile.ZIP_DEFLATED;archive.writestr(info,snapshot[rel])
        for rel,data in extra.items():
            info=zipfile.ZipInfo(stem+'/'+rel,(2026,11,11,0,0,0));info.external_attr=0o100644<<16;info.compress_type=zipfile.ZIP_DEFLATED;archive.writestr(info,data)
    sums=out/'SHA256SUMS';sums.write_text(''.join(f'{digest(p.read_bytes())}  {p.name}\n' for p in [bundle,target]))
    print('Created',bundle.name,'and',target.name,'with audited membership and SHA256SUMS.')
if __name__=='__main__':main()
