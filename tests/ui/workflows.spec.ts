import { test, expect } from "@playwright/test";

test("course, classes, assignment, and in-class exam stay consistent", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.getByRole("button", { name: "Create your first course" }).click();
  await page
    .getByLabel("Semester name", { exact: true })
    .fill("Current semester");
  await page
    .getByRole("button", { name: "Create semester", exact: true })
    .click();
  await page.getByLabel("Course name", { exact: true }).fill("Data Structures");
  await page.getByLabel("Course code", { exact: true }).fill("CMPT 225");
  await page.getByLabel("Professor", { exact: true }).fill("Igor Shinkar");
  await page.getByRole("button", { name: "Choose server icon" }).click();
  await page
    .getByRole("button", { name: "Create course", exact: true })
    .click();
  await expect(
    page.getByText("Data Structures", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Manage classes", exact: true })
    .click();
  await page.getByLabel("Title", { exact: true }).fill("Lecture");
  await page.getByLabel("Starts at", { exact: true }).fill("09:30");
  await page.getByLabel("Ends at", { exact: true }).fill("10:30");
  await page.getByLabel("Location", { exact: true }).fill("B9201");
  await page.getByRole("button", { name: "Create event", exact: true }).click();
  await expect(page.getByText("Weekly classes", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "Add assignment", exact: true })
    .click();
  await page.getByLabel("Title", { exact: true }).fill("Problem set 3");
  await page.getByRole("button", { name: "Add subtask", exact: true }).click();
  await page
    .getByLabel("Subtask 1", { exact: true })
    .fill("Read the questions");
  await page.getByRole("button", { name: "Create event", exact: true }).click();
  await page.getByRole("link", { name: "ToDo", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Collapse Data Structures" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Open Problem set 3", exact: true })
    .click();
  await page.getByRole("checkbox", { name: "Read the questions" }).click();
  await expect(
    page.getByText("Subtasks · 100%", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await page.screenshot({
    path: info.outputPath("assignments.png"),
    fullPage: true,
  });
  await page.getByRole("link", { name: "Today", exact: true }).click();
  await page.getByRole("button", { name: "Open Lecture", exact: true }).click();
  await page
    .getByRole("button", { name: "Add in-class exam or quiz", exact: true })
    .click();
  await page.getByLabel("Title", { exact: true }).fill("Midterm");
  await page.getByRole("button", { name: "Create event", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Open Midterm", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Open Lecture", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Today", exact: true }),
  ).toBeInViewport();
  await page.screenshot({ path: info.outputPath("today.png"), fullPage: true });
  await page.getByRole("link", { name: "Calendar", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Open Midterm", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Calendar", exact: true }),
  ).toBeInViewport();
  await page.screenshot({
    path: info.outputPath("calendar.png"),
    fullPage: true,
  });
  await page.getByRole("link", { name: "Settings", exact: true }).click();
  await page.getByRole("button", { name: "Dark", exact: true }).click();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Dark", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("link", { name: "ToDo", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Open Problem set 3", exact: true }),
  ).toBeVisible();
  await page.getByRole("checkbox", { name: "Complete Problem set 3" }).click();
  await expect(
    page.getByText("You’re all caught up", { exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("standalone plans work without a course and fit the viewport", async ({
  page,
}) => {
  await page.goto("/today");
  await page.getByRole("button", { name: "Add event", exact: true }).click();
  await page.getByLabel("Title", { exact: true }).fill("Study with friends");
  await page.getByRole("button", { name: "Create event", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Open Study with friends", exact: true }),
  ).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(overflow).toBe(false);
});

test("invalid subtask targets stay editable and cannot be saved", async ({
  page,
}) => {
  await page.goto("/event/new");
  await page.getByLabel("Title", { exact: true }).fill("Independent reading");
  await page.getByRole("button", { name: "Add subtask", exact: true }).click();
  await page.getByLabel("Subtask 1", { exact: true }).fill("Read chapter one");
  await page.getByLabel("Target completion", { exact: true }).fill("tomorrow");
  await page.getByRole("button", { name: "Create event", exact: true }).click();
  await expect(
    page.getByText(
      "Enter subtask targets as YYYY-MM-DD HH:MM, or leave them empty.",
    ),
  ).toBeVisible();
  await page.getByLabel("Target completion", { exact: true }).fill("");
  await page.getByRole("button", { name: "Create event", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Open Independent reading", exact: true }),
  ).toBeVisible();
});
