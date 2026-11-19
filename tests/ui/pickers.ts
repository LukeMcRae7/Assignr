import { Page } from "@playwright/test";
import { format, parseISO } from "date-fns";

export async function chooseDate(page: Page, label: string, date: string) {
  await page.getByRole("button", { name: label, exact: true }).click();
  const picker = page.getByRole("dialog", { name: label, exact: true }).last();
  if (!date) {
    await picker
      .getByRole("button", { name: "Clear date", exact: true })
      .click();
    return;
  }
  const target = parseISO(date);
  const monthHeading = picker.getByRole("button", {
    name: "Choose month and year",
  });
  await monthHeading.click();
  const delta =
    target.getFullYear() - parseInt((await monthHeading.textContent())!, 10);
  for (let i = 0; i < Math.abs(delta); i++)
    await picker
      .getByRole("button", { name: delta > 0 ? "Next year" : "Previous year" })
      .click();
  await picker
    .getByRole("button", { name: format(target, "MMMM yyyy"), exact: true })
    .click();
  await picker
    .getByRole("button", {
      name: format(target, "EEEE, MMMM d, yyyy"),
      exact: true,
    })
    .click();
}
export async function chooseTime(page: Page, label: string, time: string) {
  await page.getByRole("button", { name: label, exact: true }).last().click();
  const picker = page.getByRole("dialog", { name: label, exact: true }).last();
  const [hour, minute] = time.split(":");
  const hasPeriod = await picker
    .getByRole("button", { name: "AM", exact: true })
    .count();
  if (hasPeriod)
    await picker
      .getByRole("button", {
        name: Number(hour) >= 12 ? "PM" : "AM",
        exact: true,
      })
      .click();
  await picker
    .getByRole("button", {
      name: "Hour " + (hasPeriod ? Number(hour) % 12 || 12 : hour),
      exact: true,
    })
    .click();
  await picker
    .getByRole("button", { name: "Minute " + minute, exact: true })
    .click();
  await picker.getByRole("button", { name: "Done", exact: true }).click();
}
