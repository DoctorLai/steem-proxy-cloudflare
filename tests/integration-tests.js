#!/usr/bin/env node

const API_URL = process.env.STEEM_RPC_URL || "https://api2.steemyy.com";

if (typeof globalThis.log === "undefined") {
  globalThis.log = (...args) => console.log(...args);
}

const steemModule = await import("steem").then((m) => m.default ?? m);
const dsteemModule = await import("dsteem").then((m) => m.default ?? m);
const steem = steemModule;
const dsteem = dsteemModule;

steem.api.setOptions({ url: API_URL });
log(`Using Steem Node ${steem.api.options.url}`);

steem.api.getAccounts(["justyy", "ety001"], function (err, result) {
  if (!err) {
    for (let i = 0; i < result.length; ++i) {
      let reputation = result[i].reputation;
      let formatted_rep = steem.formatter.reputation(reputation);
      log(result[i].name + "'s Reputation is " + formatted_rep);
    }
  } else {
    log("Steem API Error:", err);
  }
});

let username = "test";
let password = "password";
log(dsteem.PrivateKey.fromLogin(username, password, "owner").createPublic());

function steemCall(method, params) {
  return new Promise((resolve, reject) => {
    steem.api[method](...params, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });
}

function steemRpcCall(method, params) {
  return new Promise((resolve, reject) => {
    steem.api.call(method, params, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });
}

const tests = [];
function addTest(name, fn) {
  tests.push({ name, fn });
}

addTest("steem.api.getAccounts", async () => {
  const accounts = await steemCall("getAccounts", [["justyy"]]);
  if (accounts && accounts[0] && accounts[0].name === "justyy") return;
  throw new Error("Account not returned");
});

addTest("steem.formatter.reputation", async () => {
  const rep = steem.formatter.reputation("352352352352");
  if (typeof rep === "number") return;
  throw new Error("Formatter did not return number");
});

addTest("steem.api.getDynamicGlobalProperties", async () => {
  const props = await steemCall("getDynamicGlobalProperties", []);
  if (props && props.head_block_number) return;
  throw new Error("Missing head_block_number");
});

addTest("steem.api.getChainProperties", async () => {
  await steemCall("getChainProperties", []);
});

addTest("steem.api.getConfig", async () => {
  await steemCall("getConfig", []);
});

addTest("steem.api.getRewardFund", async () => {
  const fund = await steemCall("getRewardFund", ["post"]);
  if (fund && fund.reward_balance) return;
  throw new Error("Reward fund missing");
});

addTest("steem.api.getCurrentMedianHistoryPrice", async () => {
  const price = await steemCall("getCurrentMedianHistoryPrice", []);
  if (price && price.base) return;
  throw new Error("Missing price");
});

addTest("steem.api.getAccountHistory", async () => {
  const hist = await steemCall("getAccountHistory", ["justyy", -1, 1]);
  if (Array.isArray(hist)) return;
  throw new Error("History not an array");
});

addTest("steem.api.getDiscussionsByCreated", async () => {
  const posts = await steemCall("getDiscussionsByCreated", [{ tag: "steem", limit: 1 }]);
  if (Array.isArray(posts)) return;
  throw new Error("Posts not array");
});

addTest("steem.api.getTrendingTags", async () => {
  const tags = await steemCall("getTrendingTags", ["steem", 1]);
  if (Array.isArray(tags)) return;
  throw new Error("Tags not array");
});

addTest("steem.api.getBlock", async () => {
  const data = await steemCall("getBlock", [102496700]);
  if (data.previous === "061bf9bb3389a026b4e07f3b28aaa24d87c639e1") return;
  throw new Error("getBlock return error");
});

const dynamicBlockTest = new Promise((resolve, reject) => {
  steem.api.getDynamicGlobalProperties((err, result) => {
    if (err) {
      console.error(err);
      reject(err);
      return;
    }

    const latestBlock = result.head_block_number;
    log("Latest block height:", latestBlock);
    addTest(`steem.api.getBlock (latest block height ${latestBlock})`, async () => {
      const data = await steemCall("getBlock", [latestBlock]);
      log(data);
      if (data.previous && data.witness && data.timestamp && data.witness_signature) return;
      throw new Error(`getBlock (latest block height: ${latestBlock}) return error`);
    });

    resolve();
  });
});

addTest("Negative invalid method name", async () => {
  try {
    await steemRpcCall("NON_EXISTENT_METHOD", {});
  } catch {
    return;
  }
  throw new Error("Invalid method unexpectedly succeeded");
});

addTest("Negative invalid history range", async () => {
  try {
    await steemCall("getAccountHistory", ["justyy", 999999999, -5]);
  } catch {
    return;
  }
  throw new Error("Invalid history range unexpectedly succeeded");
});

async function runTests() {
  log("Starting SteemJS test suite...");
  let failures = 0;

  for (const t of tests) {
    try {
      await t.fn();
      log(`✅Test passed: ${t.name}`);
    } catch (err) {
      failures += 1;
      log(`❌Test failed: ${t.name} (${err.message || err})`);
    }
  }

  log("Finished.");

  if (failures > 0) {
    throw new Error(`${failures} integration test(s) failed`);
  }
}

try {
  await dynamicBlockTest;
  await runTests();
  log(`SteemJs Version: ${steem.version}`);
} catch (err) {
  console.error(err);
  process.exit(1);
}
