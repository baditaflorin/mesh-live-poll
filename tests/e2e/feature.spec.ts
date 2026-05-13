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
