const path = require('path');
const child_process = require('child_process');
const request = require('request');
const mkdirp = require('mkdirp');

function shallowGitClone(dest, repo) {
  console.log(`cloning "${repo}" to "${dest}"...`);
  child_process.execFileSync("git", [
    'clone',
    '--depth',
    '1',
    repo,
    dest,
  ], { stdio: 'inherit' });
}

function getUserRepos(user, page, callback) {
  const options = {
    url: `https://api.github.com/users/${user}/repos`,
    qs: {
      page: page,
      per_page: 100,
    },
    headers: {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'node-request',
    },
    json: true,
  };
  request.get(options, (err, response, body) => {
    if (!err && response.statusCode === 200) {
      callback(body);
    } else {
      console.log(err);
      console.log(response.statusCode);
      console.log(body);
      throw new Error('request to github api failed!!!');
    }
  });
}

function getAllUserRepos(user, callback) {
  let page = 1;
  let results = [];
  function onRequestComplete(repos) {
    results = results.concat(...repos);
    if (repos.length !== 100) {
      callback(results);
    } else {
      page += 1;
      getUserRepos(user, page, onRequestComplete);
    }
  }
  getUserRepos(user, page, onRequestComplete);
}

// Downloads every repository on the textmate github account that ends with
// '.tmbundle'.
function downloadTextmateBundles() {
  mkdirp.sync('./raw/textmate');
  getAllUserRepos('textmate', (repos) => {
    repos
      .filter(repo => repo.name.endsWith('.tmbundle'))
      .forEach(repo => {
        const dest = path.join('./raw/textmate/', repo.name);
        const cloneUrl = repo.clone_url;
        shallowGitClone(dest, cloneUrl);
      })
  });
}

// Downloads every repository on the atom github account that starts with
// 'language-'
function downloadAtomLanguages() {
  mkdirp.sync('./raw/atom');
  getAllUserRepos('atom', (repos) => {

    repos = repos.filter(repo => repo.name.startsWith('language-'))
    console.log(`${repos.length} languages total`);

    repos
      .filter(repo => repo.name.startsWith('language-'))
      .forEach(repo => {
        const dest = path.join('./raw/atom/', repo.name);
        const cloneUrl = repo.clone_url;
        shallowGitClone(dest, cloneUrl);
      })
  });
}

// Downloads vscode. The languages they provide are all included I think.
function downloadVscode() {
  shallowGitClone('./raw/vscode', 'https://github.com/Microsoft/vscode.git');
}

downloadTextmateBundles();
downloadAtomLanguages();
downloadVscode();
