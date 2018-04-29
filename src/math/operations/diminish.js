// @flow
import _ from 'lodash';

import { hasMultiple, removeExtraneousVertices } from './operationUtils';
import Peak from 'math/Peak';
import { numSides } from 'math/solidUtils';
import type { Operation } from './operationTypes';
import {
  getAugmentAlignment,
  getPeakAlignment,
  getCupolaGyrate,
} from 'math/applyOptionUtils';

function removeVertices(polyhedron, peak) {
  const newFaces = polyhedron.faces.concat([peak.boundary()]);
  _.pullAt(newFaces, peak.faceIndices());
  return removeExtraneousVertices(polyhedron.withFaces(newFaces));
}

interface DiminishOptions {
  peak: Peak;
}

export const diminish: Operation<DiminishOptions> = {
  apply(polyhedron, { peak }) {
    return removeVertices(polyhedron, peak);
  },

  getSearchOptions(polyhedron, config, relations) {
    const options = {};
    const { peak } = config;
    if (!peak) {
      throw new Error('Invalid peak');
    }
    const vIndices = peak.innerVertexIndices();
    // If diminishing a pentagonal cupola/rotunda, check which one it is
    if (vIndices.length === 5) {
      options.using = 'U5';
    } else if (vIndices.length === 10) {
      options.using = 'R5';
    }

    if (hasMultiple(relations, 'gyrate')) {
      options.gyrate = getCupolaGyrate(polyhedron, peak);
    }

    if (options.gyrate !== 'ortho' && hasMultiple(relations, 'align')) {
      options.align = getPeakAlignment(polyhedron, peak);
    }
    return options;
  },

  getAllApplyArgs(polyhedron) {
    return Peak.getAll(polyhedron).map(peak => ({ peak }));
  },

  getApplyArgs(polyhedron, hitPnt) {
    const peak = polyhedron.findPeak(hitPnt);
    return peak ? { peak } : {};
  },

  isHighlighted(polyhedron, applyArgs, fIndex) {
    if (
      _.isObject(applyArgs.peak) &&
      _.includes(applyArgs.peak.faceIndices(), fIndex)
    ) {
      // return polygonColors(diminishColors)[getColorIndex(face)]
      return true;
    }
  },
};

function applyShorten(polyhedron) {
  // Find a prism or antiprism face
  const face = _(polyhedron.faces)
    .filter((face, fIndex) => {
      const adjacentFace = polyhedron.faceGraph()[fIndex];
      const adjacent = adjacentFace.map(fIndex2 => polyhedron.faces[fIndex2]);
      return _.keys(_.countBy(adjacent, numSides)).length === 1;
    })
    .maxBy(numSides);
  return removeVertices(polyhedron, new Peak(polyhedron, face, 'prism'));
}

export const shorten: Operation<> = {
  apply: applyShorten,
};
