/**
 * Copyright (c) 2015-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import objectEntries from '../polyfills/objectEntries';
import type {
  GraphQLFieldConfigArgumentMap,
  GraphQLArgument,
} from './definition';
import { GraphQLNonNull } from './definition';
import { GraphQLString, GraphQLBoolean } from './scalars';
import defineToStringTag from '../jsutils/defineToStringTag';
import defineToJSON from '../jsutils/defineToJSON';
import instanceOf from '../jsutils/instanceOf';
import invariant from '../jsutils/invariant';
import inspect from '../jsutils/inspect';
import type { DirectiveDefinitionNode } from '../language/ast';
import {
  DirectiveLocation,
  type DirectiveLocationEnum,
} from '../language/directiveLocation';

/**
 * Test if the given value is a GraphQL directive.
 */
declare function isDirective(
  directive: mixed,
): boolean %checks(directive instanceof GraphQLDirective);
// eslint-disable-next-line no-redeclare
export function isDirective(directive) {
  return instanceOf(directive, GraphQLDirective);
}

export function assertDirective(directive: mixed): GraphQLDirective {
  invariant(
    isDirective(directive),
    `Expected ${inspect(directive)} to be a GraphQL directive.`,
  );
  return directive;
}

/**
 * Directives are used by the GraphQL runtime as a way of modifying execution
 * behavior. Type system creators will usually not create these directly.
 */
export class GraphQLDirective {
  name: string;
  description: ?string;
  locations: Array<DirectiveLocationEnum>;
  args: Array<GraphQLArgument>;
  astNode: ?DirectiveDefinitionNode;

  constructor(config: GraphQLDirectiveConfig): void {
    this.name = config.name;
    this.description = config.description;
    this.locations = config.locations;
    this.astNode = config.astNode;
    invariant(config.name, 'Directive must be named.');
    invariant(
      Array.isArray(config.locations),
      `@${config.name} locations must be an Array.`,
    );

    const args = config.args || {};
    invariant(
      typeof args === 'object' && !Array.isArray(args),
      `@${config.name} args must be an object with argument names as keys.`,
    );

    this.args = objectEntries(args).map(([argName, arg]) => ({
      name: argName,
      description: arg.description === undefined ? null : arg.description,
      type: arg.type,
      defaultValue: arg.defaultValue,
      astNode: arg.astNode,
    }));
  }

  toString(): string {
    return '@' + this.name;
  }
}

// Conditionally apply `[Symbol.toStringTag]` if `Symbol`s are supported
defineToStringTag(GraphQLDirective);
defineToJSON(GraphQLDirective);

export type GraphQLDirectiveConfig = {|
  name: string,
  description?: ?string,
  locations: Array<DirectiveLocationEnum>,
  args?: ?GraphQLFieldConfigArgumentMap,
  astNode?: ?DirectiveDefinitionNode,
|};

/**
 * Used to conditionally include fields or fragments.
 */
export const GraphQLIncludeDirective = new GraphQLDirective({
  name: 'include',
  description:
    'Directs the executor to include this field or fragment only when ' +
    'the `if` argument is true.',
  locations: [
    DirectiveLocation.FIELD,
    DirectiveLocation.FRAGMENT_SPREAD,
    DirectiveLocation.INLINE_FRAGMENT,
  ],
  args: {
    if: {
      type: GraphQLNonNull(GraphQLBoolean),
      description: 'Included when true.',
    },
  },
});

/**
 * Used to conditionally skip (exclude) fields or fragments.
 */
export const GraphQLSkipDirective = new GraphQLDirective({
  name: 'skip',
  description:
    'Directs the executor to skip this field or fragment when the `if` ' +
    'argument is true.',
  locations: [
    DirectiveLocation.FIELD,
    DirectiveLocation.FRAGMENT_SPREAD,
    DirectiveLocation.INLINE_FRAGMENT,
  ],
  args: {
    if: {
      type: GraphQLNonNull(GraphQLBoolean),
      description: 'Skipped when true.',
    },
  },
});

/**
 * Constant string used for default reason for a deprecation.
 */
export const DEFAULT_DEPRECATION_REASON = 'No longer supported';

/**
 * Used to declare element of a GraphQL schema as deprecated.
 */
export const GraphQLDeprecatedDirective = new GraphQLDirective({
  name: 'deprecated',
  description: 'Marks an element of a GraphQL schema as no longer supported.',
  locations: [DirectiveLocation.FIELD_DEFINITION, DirectiveLocation.ENUM_VALUE],
  args: {
    reason: {
      type: GraphQLString,
      description:
        'Explains why this element was deprecated, usually also including a ' +
        'suggestion for how to access supported similar data. Formatted using ' +
        'the Markdown syntax (as specified by [CommonMark](https://commonmark.org/).',
      defaultValue: DEFAULT_DEPRECATION_REASON,
    },
  },
});

/**
 * The full list of specified directives.
 */
export const specifiedDirectives: $ReadOnlyArray<*> = [
  GraphQLIncludeDirective,
  GraphQLSkipDirective,
  GraphQLDeprecatedDirective,
];

export function isSpecifiedDirective(
  directive: GraphQLDirective,
): boolean %checks {
  return specifiedDirectives.some(
    specifiedDirective => specifiedDirective.name === directive.name,
  );
}
