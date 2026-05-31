import { expect, test } from "@playwright/test";
import { openTwoPeers } from "@baditaflorin/mesh-common/testing";
import { readFileSync } from "node:fs";

const pkg = JSON.parse(readFileSync(new URL("../../package.json", import.meta.url), "utf8")) as {
  name: string;
};
const storagePrefix = pkg.name;

test("option added by A is votable by B; vote count syncs back to A", async ({
  browser,
  baseURL,
}) => {
  const { a, b, cleanup } = await openTwoPeers(browser, baseURL ?? "", { storagePrefix });
  try {
    await a.getByPlaceholder("your name").fill("alice");
    await b.getByPlaceholder("your name").fill("bob");

    await a.getByPlaceholder("add an option").fill("pizza");
    await a.getByRole("button", { name: "+ add", exact: true }).click();

    await expect(b.locator(".poll-option-label")).toContainText(["pizza"]);

    await b.locator(".poll-option-btn", { hasText: "pizza" }).click();

    await expect(a.locator(".poll-status")).toContainText("1 vote");
    await expect(a.locator(".poll-option-count").first()).toContainText("1");
  } finally {
    await cleanup();
  }
});

test("A votes option 1, B votes option 2 — both peers' bar charts converge to the same tallies", async ({
  browser,
  baseURL,
}) => {
  const { a, b, cleanup } = await openTwoPeers(browser, baseURL ?? "", { storagePrefix });
  try {
    await a.getByPlaceholder("your name").fill("alice");
    await b.getByPlaceholder("your name").fill("bob");

    // A seeds two options; both must propagate to B before anyone votes.
    await a.getByPlaceholder("add an option").fill("cats");
    await a.getByRole("button", { name: "+ add", exact: true }).click();
    await a.getByPlaceholder("add an option").fill("dogs");
    await a.getByRole("button", { name: "+ add", exact: true }).click();

    await expect(b.locator(".poll-option-label")).toContainText(["cats", "dogs"]);

    // Each peer votes for a DIFFERENT option from its own browser.
    await a.locator(".poll-option-btn", { hasText: "cats" }).click();
    await b.locator(".poll-option-btn", { hasText: "dogs" }).click();

    // Both screens must independently converge: 2 total votes, 1 per option.
    const count = (page: typeof a, label: string) =>
      page.locator(".poll-option", { hasText: label }).locator(".poll-option-count");
    for (const page of [a, b]) {
      await expect(page.locator(".poll-status")).toContainText("2 votes");
      await expect(count(page, "cats")).toHaveText(/^1\b/);
      await expect(count(page, "dogs")).toHaveText(/^1\b/);
    }

    // Re-vote / reconnect must not double-count: A switches its vote to dogs.
    // One-peer-one-vote keyed by peerId means total stays 2, not 3.
    await a.locator(".poll-option-btn", { hasText: "dogs" }).click();
    for (const page of [a, b]) {
      await expect(page.locator(".poll-status")).toContainText("2 votes");
      await expect(count(page, "cats")).toHaveText(/^0\b/);
      await expect(count(page, "dogs")).toHaveText(/^2\b/);
    }
  } finally {
    await cleanup();
  }
});

test("question edited on A is visible on B", async ({ browser, baseURL }) => {
  const { a, b, cleanup } = await openTwoPeers(browser, baseURL ?? "", { storagePrefix });
  try {
    await a.getByRole("button", { name: /tap to set a question/ }).click();
    await a.getByPlaceholder("ask a question").fill("favorite food?");
    await a.getByRole("button", { name: "save", exact: true }).click();

    await expect(b.locator(".poll-q-display")).toContainText("favorite food?");
  } finally {
    await cleanup();
  }
});
