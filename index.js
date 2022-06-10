#!/usr/bin/env node

const puppeteer = require('puppeteer');
const { request, gql } = require('graphql-request');
const { writeFile } = require('fs/promises');

const CONFIG = { width: 10800, height: 16200 }; // Height must be <16384 https://bugs.chromium.org/p/chromium/issues/detail?id=770769&desc=2

let browser;
const run = async () => {
  browser = await puppeteer.launch({
    headless: true,
    defaultViewport: {
      ...CONFIG,
      deviceScaleFactor: 1
    }
  });
  const inputs = process.argv.slice(2);
  for (const input of inputs) {
    if (input.includes(',')) {
      const shields = input
        .split(',')
        .map(n => parseInt(n))
        .filter(n => n != NaN);
      for (const shield of shields) {
        await exportShield(shield);
      }
    } else if (input.includes('-')) {
      const [start, end] = input.split('-').map(n => parseInt(n));
      for (let i = start; i <= end; i++) {
        await exportShield(i);
      }
    } else {
      await exportShield(input);
    }
  }
  await browser.close();
};
run();

async function exportShield(tokenId) {
  if (tokenId < 1 || tokenId > 5000 || parseInt(tokenId) == NaN)
    return console.log(`Skipping #${tokenId} - invalid tokenId.`);
  const { svg, built } = await getShield(tokenId);

  if (!built) return console.log(`Skipping #${tokenId} - not built yet.`);

  console.log(`Saving #${tokenId}...`);
  const page = await browser.newPage();
  await page.setContent(
    `<html><style>svg { width: 100vw; height: 100vh; }</style>${svg}</div></html>`
  );

  await page.evaluate(() => (document.body.style.background = 'transparent'));
  await new Promise(resolve => setTimeout(resolve, 250));

  const file = await page.screenshot({ type: 'png', omitBackground: true });
  await writeFile(`./${tokenId}.png`, file);

  console.log(`Saved #${tokenId}!`);
}

async function getShield(tokenId) {
  const res = await request(
    'https://api.thegraph.com/subgraphs/name/johncpalmer/shields',
    gql`
  query {
    token(id: "${tokenId}") {
      id
      built
      name
      svg
    }
  }
`
  );
  return res.token;
}
