import { expect, test } from '@playwright/test'

async function ask(page: import('@playwright/test').Page, question: string) {
  const input = page.getByPlaceholder('Ask about a currency…')
  await input.fill(question)
  await input.press('Enter')
}

test('a conversion renders as a table, and the chat survives a reload', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveURL(/\/chat\/[\w-]{8,}$/)
  const chatUrl = page.url()

  await ask(page, 'How much is 100 dollars in reais?')
  const table = page.getByRole('table')
  await expect(table.getByRole('row', { name: /BRL/ })).toContainText('558.84')
  await expect(page.getByText('Those are the ECB reference rates from Monday.')).toBeVisible()

  await page.reload()
  await expect(page.getByText('How much is 100 dollars in reais?')).toBeVisible()
  await expect(page.getByRole('row', { name: /BRL/ })).toContainText('558.84')

  // A new chat lists this one under recent chats
  await page.getByRole('link', { name: 'New chat' }).click()
  await expect(page).not.toHaveURL(chatUrl)
  await page.getByText('Recent chats').click()
  await page.getByRole('link', { name: 'How much is 100 dollars in reais?' }).click()
  await expect(page).toHaveURL(chatUrl)
  await expect(page.getByRole('row', { name: /BRL/ })).toContainText('558.84')
})

test('a trend question renders the history chart', async ({ page }) => {
  await page.goto('/')
  await ask(page, 'How has USD/BRL moved this month?')
  await expect(page.getByRole('img', { name: /USD to BRL from/ })).toBeVisible()
  await expect(page.getByText('5.5884').first()).toBeVisible()
})

test("another browser can't read or continue the chat", async ({ page, browser }) => {
  await page.goto('/')
  await ask(page, 'How much is 100 dollars in reais?')
  await expect(page.getByRole('row', { name: /BRL/ })).toContainText('558.84')
  // Let the save land before someone else opens the URL
  await expect(page.getByText('Those are the ECB reference rates from Monday.')).toBeVisible()
  await expect.poll(async () => (await page.request.get(page.url())).ok()).toBe(true)

  const stranger = await browser.newContext()
  const other = await stranger.newPage()
  await other.goto(page.url())
  await expect(other.getByPlaceholder('Ask about a currency…')).toBeVisible()
  await expect(other.getByText('How much is 100 dollars in reais?')).toHaveCount(0)
  await ask(other, 'What is the USD to BRL rate?')
  await expect(other.getByText('Chat not found')).toBeVisible()
  await stranger.close()
})
