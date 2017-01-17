
var fs = require('fs');
var path = require('path');
const glob = require('glob');

function loadAllGrammars() {
  return glob.sync('./grammars/*/*.json');
}

function hasEveryKey(obj, ...keys) {
  return keys.every(key => obj.hasOwnProperty(key));
}

function hasSomeKey(obj, ...keys) {
  return keys.some(key => obj.hasOwnProperty(key));
}

class Parser {

  constructor() {
    this.scope = [];
    this.totals = new Map();
  }

  addToTotals(kind, additions) {

    let map;
    if (this.totals.has(kind)) {
      map = this.totals.get(kind);
    } else {
      map = new Map();
    }

    const scope = this.fname + this.currentScope();

    additions.forEach(key => {
      if (!map.has(key)) {
        map.set(key, new Set([scope,]));
      } else {
        map.get(key).add(scope);
      }
    });

    if (!map.has('_total')) {
      map.set('_total', new Set([scope,]));
    } else {
      map.get('_total').add(scope);
    }

    this.totals.set(kind, map);
  }

  parse(grammars) {
    grammars.forEach(grammar => this.parseGrammar(grammar));

    for (let [kind, totals] of this.totals.entries()) {
      console.log(kind);
      Array.from(totals.keys()).sort().forEach(key => {
        console.log(`  ${key}: ${totals.get(key).size}`);
      });
    }
  }

  parseGrammar(fname) {

    this.fname = fname;
    const grammar = JSON.parse(fs.readFileSync(fname, 'utf8'))

    this.scope.push(`"${grammar.name}"`);
    const grammarKeys = new Set(Object.keys(grammar));

    this.addToTotals('grammar', grammarKeys);

    if (grammarKeys.has('patterns')) {
      this.withScope('patterns', () => {
        this.parsePatterns(grammar.patterns);
      });
    }

    if (grammarKeys.has('repository')) {
      this.withScope('repository', () => {
        this.parseRepository(grammar.repository);
      });
    }
    this.scope.pop();
  }

  parsePatterns(patterns) {
    if (!Array.isArray(patterns)) {
      this.log('expected patterns to be an array');
      return;
    }

    if (patterns.length === 0) {
      this.log('expected patterns to have more than zero elements');
      return;
    }

    patterns.forEach((rule, idx) => {
      this.withScope(`[${idx}]`, () => {
        this.parseRule(rule);
      })
    });
  }

  parseRepository(repository) {
    const keys = Object.keys(repository);

    if (keys.length === 0) {
      this.log('expected repository to have more than zero elements');
      return;
    }

    keys.forEach(key => {
      this.withScope(`"${key}"`, () => {
        this.parseRepositoryEntry(repository[key]);
      })
    });
  }

  parseRepositoryEntry(entry) {

    

    const entryIsRule = hasSomeKey(entry,
      'match', 'begin', 'end', 'while', 'include');
    if (entryIsRule) {
      this.parseRule(entry);
      return;
    }

    const entryKeys = new Set(Object.keys(entry));

    this.addToTotals('repositoryEntry', entryKeys);

    if (entryKeys.has('patterns')) {
      this.withScope('patterns', () => {
        this.parsePatterns(entry.patterns);
      });
    }

    if (entryKeys.has('repository')) {
      this.withScope('repository', () => {
        this.parseRepository(entry.repository);
      });
    }
  }

  parseRule(rule) {

    const keys = new Set(Object.keys(rule));

    if (keys.has('include')) {
      this.addToTotals('includeRule', keys);
    } else if (rule.hasOwnProperty('match')) {
      this.addToTotals('matchRule', keys);
    } else if (rule.hasOwnProperty('end')) {
      this.addToTotals('beginEndRule', keys);
    } else if (rule.hasOwnProperty('while')) {
      this.addToTotals('beginWhileRule', keys);
    } else {
      this.addToTotals('badRule', keys);
      this.log(`bad rule: ${JSON.stringify(rule, null, 2)}`)
    }

    //this.debugLogIfKeyExists(rule, 'injections');

    this.addToTotals('rule', keys);

    if (keys.has('captures')) {
      this.withScope('captures', () => {
        this.parseCaptures(rule.captures);
      })
    }

    if (keys.has('beginCaptures')) {
      this.withScope('beginCaptures', () => {
        this.parseCaptures(rule.beginCaptures);
      })
    }

    if (keys.has('endCaptures')) {
      this.withScope('endCaptures', () => {
        this.parseCaptures(rule.endCaptures);
      })
    }

    if (keys.has('whileCaptures')) {
      this.withScope('whileCaptures', () => {
        this.parseCaptures(rule.whileCaptures);
      })
    }

  }

  parseCaptures(captures) {
    const captureKeys = new Set(Object.keys(captures));
    captureKeys.forEach(key => {

      const isInteger = /^(0|[1-9]\d*)$/.test(key);
      if (!isInteger) {
        this.log(`non-integer capture key: '${key}'`);
      }

      this.withScope(`"${key}"`, () => {
        this.parseCaptureGroup(captures[key]);
      })

    })
  }

  parseCaptureGroup(group) {
    // expect keys to be a subset of name, patterns
    const groupKeys = new Set(Object.keys(group));

    this.addToTotals('captureGroup', groupKeys);

    const expectedGroupKeys = new Set(['patterns', 'name']);
    groupKeys.forEach(key => {
      if (!expectedGroupKeys.has(key)) {
        this.log(`unexpected key in group: ${key}`);
      }
    })

    if (groupKeys.has('patterns')) {
      this.withScope('patterns', () => {
        this.parsePatterns(group.patterns);
      })
    }
  }



  withScope(scope, callback) {
    this.scope.push(scope);
    callback();
    this.scope.pop();
  }

  currentScope() {
    return this.scope.join('.');
  }

  log(message) {
    console.log(`${this.fname}`)
    console.log(`  ${this.currentScope()}:`);
    console.log(`    ${message}`);
  }

  debugLogIfKeyExists(obj, key) {
    if (obj.hasOwnProperty(key)) {
      this.log(`${key}: ${JSON.stringify(obj[key], null, 2)}`);
    }
  }

}

var grammars = loadAllGrammars();
const parser = new Parser();
parser.parse(grammars);
