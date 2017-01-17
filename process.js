const fs = require('fs');
const path = require('path');
const plist = require('fast-plist');
const mkdirp = require('mkdirp');
const CSON = require('cson');
const glob = require('glob');

function convertJSON(src, dst) {
  const contents = fs.readFileSync(src, 'utf8');
  const parsed = JSON.parse(contents);
  writeOutJson(dst, parsed);
}

function convertPlist(src, dst) {
  const contents = fs.readFileSync(src, 'utf8');
  const parsed = plist.parse(contents);
  writeOutJson(dst, parsed);
}

function convertCSON(src, dst) {
  const contents = fs.readFileSync(src, 'utf8');
  const parsed = CSON.parse(contents);
  writeOutJson(dst, parsed);
}

function writeOutJson(dst, data) {
  fs.writeFileSync(dst, JSON.stringify(data, null, 2));
}

function processTextmateGrammars() {
  mkdirp.sync('./grammars/textmate');

  glob.sync('./raw/textmate/*/Syntaxes/*')
    .filter(ignoreIfExtensionDoesntMatch('.tmlanguage', '.plist'))
    .forEach(src => {
      const dst = path.join(
        './grammars/textmate',
        `${path.basename(src)}.json`
      );
      convertPlist(src, dst);
    });
}

function processAtomGrammars() {
  mkdirp.sync('./grammars/atom');

  glob.sync('./raw/atom/*/grammars/*')
    .filter(ignoreIfExtensionDoesntMatch('.cson'))
    .forEach(src => {
      const dst = path.join(
        './grammars/atom',
        `${path.basename(src)}.json`
      );
      convertCSON(src, dst);
    })
}

function processVscodeGrammars() {
  mkdirp.sync('./grammars/vscode');

  glob.sync('./raw/vscode/extensions/*/syntaxes/*')
    .filter(ignoreIfExtensionDoesntMatch('.json', '.tmlanguage', '.plist'))
    .forEach(src => {
      let dst = path.join(
        './grammars/vscode',
        `${path.basename(src)}`
      );
      if (src.toLowerCase().endsWith('.json')) {
        convertJSON(src, dst);   
      } else {
        dst = `${dst}.json`;
        convertPlist(src, dst);
      }
    });
}

function ignoreIfExtensionDoesntMatch(...extensions) {
  return (filepath) => {
    const lower = filepath.toLowerCase();
    const matches = extensions.some(ext => lower.endsWith(ext));
    if (!matches) {
      console.log(`ignorning ${filepath}`);
    }
    return matches;
  };
}

processTextmateGrammars();
processAtomGrammars();
processVscodeGrammars();
