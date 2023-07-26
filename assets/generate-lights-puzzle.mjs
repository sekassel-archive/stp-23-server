import {Digraph, toDot} from "ts-graphviz";

main();

function main() {
  const lights = [
    {states: [0, 1]},
    {
      states: [0, 1], toggle(state) {
        state[1] = 1 - state[1];
        state[4] = 1 - state[4];
      }
    },
    {
      states: [0, 1, 2], toggle(state) {
        state[2] = (state[2] + 1) % 3;
        if (state[2] === 0) {
          state.fill(0, 0, 5);
        }
      }
    },
    {
      states: [0, 1], toggle(state) {
        state[3] = 1 - state[3];
        state[0] = state[0] ^ state[1];
      }
    },
    {states: [0, 1]},
  ];

  const initialState = [0, 0, 0, 0, 0];

  const transitions = generateTransitions(initialState, lights);
  const nodes = new Set(Object.values(transitions));

  console.log('Total nodes:', nodes.size);

  const pathLength = {[initialState.join('')]: 0};
  findFarthestNodes(initialState.join(''), transitions, lights, pathLength);
  console.log('Path lengths:');
  console.log('10001', pathLength['10001']);
  console.log('11111', pathLength['11111']);
  console.log('11211', pathLength['11211']);

  const objects = generateObjects(nodes, transitions, lights);
  console.log('Objects:');
  for (const object of Object.values(objects)) {
    console.log(',', JSON.stringify(object));
  }

  const graph = generateGraph(transitions);
  console.log(toDot(graph));
}


function generateTransitions(initialState, lights) {
  const transitions = {};

  const todo = [initialState];
  const done = new Set;
  while (todo.length > 0) {
    const state = todo.shift();
    const stateString = state.join('');
    if (done.has(stateString)) {
      continue;
    }

    done.add(stateString);
    for (let i = 0; i < lights.length; i++) {
      const light = lights[i];
      if (!light.toggle) {
        continue;
      }

      const nextState = state.slice();
      light.toggle(nextState);
      const nextStateString = nextState.join('');
      transitions[stateString + ' ' + i] = nextStateString;

      if (!done.has(nextStateString)) {
        todo.push(nextState);
      }
    }
  }

  return transitions;
}

function generateGraph(transitions) {
  const graph = new Digraph();

  for (const [from, to] of Object.entries(transitions)) {
    const [fromState, label] = from.split(' ');
    const toState = to.toString();

    graph.edge([fromState, toState], {label});
  }

  return graph;
}

function findFarthestNodes(state, transitions, lights, pathLength) {
  for (let i = 0; i < lights.length; i++) {
    const transition = transitions[state + ' ' + i];
    if (!transition || pathLength[transition]) {
      continue;
    }

    pathLength[transition] = pathLength[state] + 1;
  }

  for (let i = 0; i < lights.length; i++) {
    const transition = transitions[state + ' ' + i];
    if (!transition || pathLength[transition] !== pathLength[state] + 1) {
      continue;
    }

    findFarthestNodes(transition, transitions, lights, pathLength);
  }
}

function generateObjects(nodes, transitions, lights) {
  const prefixes = ['00', '01', '11', '10'];
  const nodePos = {};
  for (let row = 0; row < prefixes.length; row++) {
    const prefix = prefixes[row];
    const filter = [...nodes].filter(node => node.startsWith(prefix)).sort();
    console.log(filter.length, ...filter);

    for (let col = 0; col < filter.length; col++) {
      nodePos[filter[col]] = [row, col];
    }
  }

  const objects = {};

  const startX = 5;
  const startY = 7;
  const offset = 32;
  const tileSize = 16;
  let id = 3;
  for (const [node, [row, col]] of Object.entries(nodePos)) {
    for (let i = 0; i < lights.length; i++) {
      const transition = transitions[node + ' ' + i];
      if (!transition) {
        continue;
      }

      const [targetRow, targetCol] = nodePos[transition];
      const targetObject = objects[transition + ' ' + i] ||= {
        id: id++,
        point: true,
        name: transition,
        x: (startX + offset * targetCol + i) * tileSize,
        y: (startY + offset * targetRow) * tileSize,
      };

      const portalObject = objects[node + ' ' + i] ||= {
        id: id++,
        x: (startX + offset * col + i) * tileSize,
        y: (startY + offset * row) * tileSize,
        name: node,
      };

      delete portalObject.point;
      portalObject.width = tileSize;
      portalObject.height = tileSize;
      portalObject.type = 'Portal';
      portalObject.properties = [{name: 'Target', type: 'object', value: targetObject.id}];
    }
  }

  return objects;
}
