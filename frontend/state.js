export const state = {
  user: null,
  token: null,
  players: [],
  overlays: [],
  selectedPlayerId: null,
};

export const bus = (() => {
  const topics = {};
  return {
    on: (topic, listener) => {
      topics[topic] = topics[topic] || [];
      topics[topic].push(listener);
    },
    emit: (topic, data) => {
      if (topics[topic]) {
        topics[topic].forEach(listener => listener(data));
      }
    },
  };
})();
