const fs = require('fs');
const path = require('path');
const glob = require('glob');
const Ajv = require('ajv');

const definitions = {
  // The genericRule schema is used as the base level of validation. With oneOf
  // rules, the errors can be very ambiguous; eg: we know that it matched none
  // of the schemas but we're not sure why. In general, all of the objects are
  // just variations of genericRule, so it can be used to pre-validate the
  // entire object before doing the more specific validations.
  genericRule: {
    type: 'object',
    properties: {
      name: { type: 'string' },
      contentName: { type: 'string' },

      match: { type: 'string' },
      begin: { type: 'string' },
      end: { type: 'string' },
      while: { type: 'string' },
      include: { type: 'string' },

      captures: { $ref: '#/definitions/captures' },
      beginCaptures: { $ref: '#/definitions/captures' },
      endCaptures: { $ref: '#/definitions/captures' },
      whileCaptures: { $ref: '#/definitions/captures' },

      disabled: { enum: [0, 1] },

      applyEndPatternLast: { constant: 1 },
      
      repository: { $ref: '#/definitions/repository' },
      patterns: { $ref: '#/definitions/patterns' },

      comment: { type: 'string' },
      injections: { $ref: '#/definitions/repository' },
    },
    minProperties: 1,
    additionalProperties: false,
  },
  patterns: {
    type: 'array',
    items: { $ref: '#/definitions/rule' },
    minItems: 1,
  },
  captures: {
    type: 'object',
    additionalProperties: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        patterns: { $ref: '#/definitions/patterns' },
      },
      minProperties: 1,
    },
    minProperties: 1,
  },
  repository: {
    type: 'object',
    additionalProperties: {
      allOf: [
        { $ref: '#/definitions/genericRule' },
        {
          oneOf: [
            { $ref: '#/definitions/rule' },
            { $ref: '#/definitions/repositoryEntry' },
          ],
        }
      ],
    },
    minProperties: 1,
  },
  repositoryEntry: {
    type: 'object',
    properties: {
      name: { type: 'string' },
      comment: { type: 'string' },
      patterns: { $ref: '#/definitions/patterns' },
      repository: { $ref: '#/definitions/repository' },
      disabled: { enum: [0, 1] },
      applyEndPatternLast: { constant: 1 },
    },
    additionalProperties: false,
    minProperties: 1,
  },

  rule: {
    allOf: [
      { $ref: '#/definitions/genericRule' },
      {
        oneOf: [
          { $ref: '#/definitions/matchRule' },
          { $ref: '#/definitions/beginEndRule' },
          { $ref: '#/definitions/beginWhileRule' },
          { $ref: '#/definitions/includeRule' },
        ]
      }
    ],
  },
  matchRule: {
    type: 'object',
    properties: {
      name: { type: 'string' },

      match: { type: 'string' },

      captures: { $ref: '#/definitions/captures' },

      disabled: { enum: [0, 1] },
      comment: { type: 'string'},
      injections: { $ref: '#/definitions/repository' },
    },
    required: ['match'],
    additionalProperties: false,
  },
  beginEndRule: {
    type: 'object',
    properties: {
      name: { type: 'string' },
      contentName: { type: 'string' },

      begin: { type: 'string' },
      end: { type: 'string' },

      applyEndPatternLast: { constant: 1 },

      captures: { $ref: '#/definitions/captures' },
      beginCaptures: { $ref: '#/definitions/captures' },
      endCaptures: { $ref: '#/definitions/captures' },

      patterns: { $ref: '#/definitions/patterns' },
      disabled: { enum: [0, 1] },

      comment: { type: 'string' },
      injections: { $ref: '#/definitions/repository' },
      repository: { $ref: '#/definitions/repository' },
    },
    required: ['begin', 'end'],
    additionalProperties: false,
  },
  beginWhileRule: {
    type: 'object',
    properties: {
      name: { type: 'string' },
      contentName: { type: 'string' },

      begin: { type: 'string' },
      while: { type: 'string' },

      captures: { $ref: '#/definitions/captures' },
      beginCaptures: { $ref: '#/definitions/captures' },
      whileCaptures: { $ref: '#/definitions/captures' },

      patterns: { $ref: '#/definitions/patterns' },
      disabled: { enum: [0, 1] },

      comment: { type: 'string' },
      injections: { $ref: '#/definitions/repository' },
      repository: { $ref: '#/definitions/repository' },
    },
    required: ['begin', 'while'],
    additionalProperties: false,
  },
  includeRule: {
    type: 'object',
    properties: {
      include: { type: 'string' },
      comment: { type: 'string' },
    },
    required: ['include'],
    additionalProperties: false,
  },
}

const schema = {
  title: 'grammar',

  type: 'object',
  properties: {
    
    name: { type: 'string' },
    scopeName: { type: 'string' },
    injections: { $ref: '#/definitions/repository' },
    patterns: { $ref: '#/definitions/patterns' },
    repository: { $ref: '#/definitions/repository' },
    
    version: { type: 'string' },
    comment: { type: 'string' },
    fileTypes: {
      type: 'array',
      items: { type: 'string' },
      uniqueItems: true,
    },
    firstLineMatch: { type: 'string' },
    foldingStartMarker: { type: 'string' },
    foldingStopMarker: { type: 'string' },
    hideFromUser: { type: 'boolean' },
    injectionSelector: { type: 'string' },
    keyEquivalent: { type: 'string' },
    uuid: {
      type: 'string',
      pattern: '^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$'
    },
  },
  required: ['name', 'scopeName', 'patterns'],
  additionalProperties: false,
  definitions: definitions,
}

const ajv = new Ajv({ verbose: true });


let total = 0;
glob.sync('./grammars/*/*.json')
  .forEach(fname => {
    const validate = ajv.compile(schema);
    const grammar = JSON.parse(fs.readFileSync(fname, 'utf8'));
    const valid = validate(grammar);
    if (!valid) {
      total += validate.errors.length;
      validate.errors.forEach(e => {
        console.log(fname);
        console.log('  ', e);
      })
    }
  })
console.log(`${total} total errors!`);