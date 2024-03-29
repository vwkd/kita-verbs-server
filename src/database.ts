import Fuse from "$fuse";
import entries from "$entries" assert { type: "json" };
import { deepMerge } from "$code-web-utilities/deep_merge.ts";
import { deepFilter } from "$code-web-utilities/deep_filter.ts";

const fuse_options = {
  threshold: 0,
  ignoreLocation: true,
  includeMatches: true,
  keys: [
    "source.value",
    "target.value.source.value",
    "target.value.value.value",
  ],
};

const fuse_index = Fuse.createIndex(fuse_options.keys, entries);

const fuse = new Fuse(entries, fuse_options, Fuse.parseIndex(fuse_index));

function filterResults(results) {
  const resultsNew = [];

  for (const result of results) {
    const { item, matches } = result;

    // don't filter if match only for index
    if (matches.length == 1 && matches[0].key == "source.value") {
      resultsNew.push(item);
      continue;
    }

    let resultNew = {};

    // note: group multiple matches per key, otherwise would become separate entries in highest ancestor array if processes separately
    for (const key of fuse_options.keys) {
      // skip match for index, otherwise would add whole item again
      if (key == "source.value") {
        continue;
      }

      const matchesForKey = matches.filter(({ key: k }) => k == key);

      if (matchesForKey.length) {
        const valuesForKey = matchesForKey.map(({ value }) => value);

        const resultForKey = deepFilter(
          item,
          key.split("."),
          (obj) => valuesForKey.some((value) => obj === value),
        );

        resultNew = deepMerge(resultNew, resultForKey);
      }
    }

    resultsNew.push(resultNew);
  }

  return resultsNew;
}

function entry(id) {
  return entries.find((entry) => entry.id == id);
}

function findEntries(term) {
  const resultsFuse = fuse.search(term);

  const results = filterResults(resultsFuse);

  return results;
}

const database = {
  entry,
  findEntries,
};

export { database };
