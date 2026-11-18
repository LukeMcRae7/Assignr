import { test, expect, Page } from "@playwright/test";
import { defaultPreferences } from "../../src/domain/model";

async function seed(page: Page) {
  await page.clock.setFixedTime(new Date("2026-11-17T20:00:00Z"));
  const base = { user_id: "local", version: 0, deleted_at: null };
  const semester = {
    ...base,
    id: "semester",
    name: "Fall 2026 · University semester",
    start_date: "2026-09-01",
    end_date: "2026-12-18",
    timezone: "America/Los_Angeles",
  };
  const course = {
    ...base,
    id: "course",
    semester_id: semester.id,
    name: "Computer Systems",
    code: "CMPT 295",
    color: "#A844BF",
    icon: "laptop",
    professor: "",
    website: "",
    position: 0,
  };
  const event = {
    ...base,
    id: "assignment",
    course_id: course.id,
    title: "Reading reflection",
    kind: "assignment",
    starts_at: null,
    ends_at: null,
    due_at: "2026-11-19T07:59:00Z",
    location: "",
    notes: "",
    priority: null,
    completed: false,
    subtasks: [
      {
        id: "subtask",
        title: "Read chapter one",
        completed: false,
        target_at: "2026-11-18T02:00:00Z",
      },
    ],
    recurrence: null,
    parent_event_id: null,
    occurrence_date: null,
    cancelled: false,
  };
  const snapshot = {
    semesters: [semester],
    courses: [
      course,
      {
        ...course,
        id: "course-two",
        name: "Data Structures",
        code: "CMPT 225",
        icon: "server",
        color: "#485BC4",
        position: 1,
      },
    ],
    events: [event],
    preferences: [
      { ...defaultPreferences("local"), timezone: "America/Los_Angeles" },
    ],
  };
  await page.addInitScript((snapshot) => {
    if (!localStorage.getItem("assignr:v1:local"))
      localStorage.setItem(
        "assignr:v1:local",
        JSON.stringify({ schema: 2, snapshot, queue: [] }),
      );
  }, snapshot);
}

async function assertFormLayout(page: Page) {
  const surface = page.getByTestId("form-surface").last();
  const issues = await surface.evaluate((root) => {
    const fields = Array.from(
      root.querySelectorAll<HTMLElement>('[data-testid="form-field"]'),
    );
    const errors: string[] = [];
    const outer = root.getBoundingClientRect();
    fields.forEach((field, i) => {
      const box = field.getBoundingClientRect();
      if (box.width <= 0 || box.height < 40)
        errors.push("Collapsed field " + i);
      if (box.left < outer.left - 1 || box.right > outer.right + 1)
        errors.push("Field outside dialog " + i);
      for (let j = i + 1; j < fields.length; j++) {
        const other = fields[j].getBoundingClientRect();
        if (
          Math.min(box.right, other.right) - Math.max(box.left, other.left) >
            1 &&
          Math.min(box.bottom, other.bottom) - Math.max(box.top, other.top) > 1
        )
          errors.push("Overlapping fields " + i + "/" + j);
      }
    });
    const header = root
      .querySelector('[data-testid="form-header"]')!
      .getBoundingClientRect();
    const body = root
      .querySelector('[data-testid="form-body"]')!
      .getBoundingClientRect();
    if (body.top < header.bottom - 1) errors.push("Body overlaps header");
    return errors;
  });
  expect(issues).toEqual([]);
  await expect(
    surface.getByRole("button", { name: /^(Create |Save changes)/ }).first(),
  ).toBeInViewport();
}

test("long event forms keep fields separate and actions reachable", async ({
  page,
}, info) => {
  await seed(page);
  await page.goto("/event/new?kind=assignment&courseId=course");
  await page.getByLabel("Title", { exact: true }).fill("Research project");
  await expect(page.getByTestId("editor-types")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Choose course", exact: true }),
  ).toContainText("Computer Systems");
  await expect(page.getByText("CMPT 295", { exact: true })).toBeVisible();
  await assertFormLayout(page);
  await page.screenshot({ path: info.outputPath("event-editor.png") });
  await page
    .getByRole("button", { name: "Choose course", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Course Data Structures", exact: true })
    .click();
  await expect(page.getByText("CMPT 225", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Title", { exact: true })).toHaveValue(
    "Research project",
  );
  const background = await page
    .getByTestId("form-surface")
    .evaluate((el) => getComputedStyle(el).backgroundColor);
  await page.emulateMedia({
    colorScheme: info.project.use.colorScheme === "dark" ? "light" : "dark",
  });
  await expect(page.getByTestId("form-surface")).not.toHaveCSS(
    "background-color",
    background,
  );
  await assertFormLayout(page);
  await page.screenshot({
    path: info.outputPath("event-editor-alt-theme.png"),
  });
  for (let i = 1; i <= 16; i++) {
    await page
      .getByRole("button", { name: "Add subtask", exact: true })
      .click();
    await page
      .getByLabel("Subtask " + i, { exact: true })
      .fill("Research step " + i);
  }
  await page.getByLabel("Target date 1", { exact: true }).fill("2026-12-01");
  await page.getByRole("button", { name: "More options", exact: true }).click();
  await page.getByLabel("Notes", { exact: true }).fill("Long form notes");
  await assertFormLayout(page);
  const body = page.getByTestId("form-body").last();
  expect(await body.evaluate((el) => el.scrollHeight > el.clientHeight)).toBe(
    true,
  );
  await page.screenshot({ path: info.outputPath("long-form.png") });
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key.startsWith("assignr:")) throw new Error("Device storage is full");
      original.call(this, key, value);
    };
  });
  await page
    .getByRole("button", { name: "Create assignment", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("Device storage is full");
  await expect(page.getByRole("alert")).toBeInViewport();
  await expect(page.getByLabel("Title", { exact: true })).toHaveValue(
    "Research project",
  );
});

test("semester controls stay in the header and the form stays compact", async ({
  page,
}, info) => {
  await seed(page);
  await page.goto("/courses");
  const selector = page.getByTestId("semester-selector");
  const heading = await page
    .getByRole("heading", { name: "Courses", exact: true })
    .boundingBox();
  const button = await selector.boundingBox();
  expect(
    Math.abs(button!.y + button!.height / 2 - heading!.y - heading!.height / 2),
  ).toBeLessThan(8);
  await selector.click();
  await page
    .getByRole("button", {
      name: "Edit Fall 2026 · University semester",
      exact: true,
    })
    .click();
  const starts = await page
    .locator('input[aria-label="Teaching starts"]')
    .boundingBox();
  const ends = await page
    .locator('input[aria-label="Teaching ends"]')
    .boundingBox();
  expect(Math.abs(starts!.y - ends!.y)).toBeLessThan(2);
  expect(ends!.x).toBeGreaterThanOrEqual(starts!.x + starts!.width);
  await expect(page.getByTestId("form-body")).not.toContainText(
    /Timezone detected|Regular classes follow|Date changes apply/,
  );
  await page.screenshot({ path: info.outputPath("semester-dialog.png") });
});

test("drafts survive cancellation and confirm before navigating away", async ({
  page,
}, info) => {
  await seed(page);
  await page.goto("/");
  await page
    .getByRole("button", { name: "Add assignment", exact: true })
    .click();
  await page.getByLabel("Title", { exact: true }).fill("Unsaved assignment");
  await page.screenshot({ path: info.outputPath("assignment-composer.png") });
  await page
    .getByTestId("form-header")
    .getByRole("button", { name: "Close", exact: true })
    .click();
  await page.getByRole("button", { name: "Keep editing", exact: true }).click();
  await expect(page.getByLabel("Title", { exact: true })).toHaveValue(
    "Unsaved assignment",
  );
  if ((page.viewportSize()?.width || 0) >= 1100) {
    await page.getByRole("link", { name: "Calendar", exact: true }).click();
  } else {
    await page
      .getByTestId("form-header")
      .getByRole("button", { name: "Close", exact: true })
      .click();
  }
  await page
    .getByRole("button", { name: "Discard changes", exact: true })
    .click();
  await expect(page.getByLabel("Title", { exact: true })).toHaveCount(0);
});

test("calendar panel keeps context visible and preserves drafts through resizing", async ({
  page,
}) => {
  test.skip((page.viewportSize()?.width || 0) < 1100, "Desktop side panel");
  await seed(page);
  await page.goto("/calendar");
  await page.getByRole("button", { name: "Add event", exact: true }).click();
  await page.getByLabel("Title", { exact: true }).fill("Study session");
  await expect(
    page.getByRole("heading", { name: "Calendar", exact: true }),
  ).toBeInViewport();
  await expect(
    page.getByTestId("screen-aside").getByTestId("form-surface"),
  ).toBeVisible();
  await assertFormLayout(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByLabel("Title", { exact: true })).toHaveValue(
    "Study session",
  );
  await assertFormLayout(page);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await expect(page.getByLabel("Title", { exact: true })).toHaveValue(
    "Study session",
  );
  await page.getByRole("button", { name: "Create event", exact: true }).click();
  await page
    .getByRole("button", { name: "Open Study session", exact: true })
    .click();
  await page.getByRole("button", { name: "Edit event", exact: true }).click();
  await page.getByLabel("Title", { exact: true }).fill("Updated study session");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(
    page.getByRole("button", {
      name: "Open Updated study session",
      exact: true,
    }),
  ).toBeVisible();
});

test("small desktop overlays scroll without compressing controls", async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 940, height: 540 });
  await seed(page);
  await page.goto("/event/new?kind=exam");
  await page.getByLabel("Title", { exact: true }).fill("Midterm");
  await page.getByRole("button", { name: "More options", exact: true }).click();
  await page
    .getByLabel("Notes", { exact: true })
    .fill("Room and preparation notes");
  await assertFormLayout(page);
  const box = await page.getByTestId("form-surface").boundingBox();
  expect(box!.y).toBeGreaterThanOrEqual(24);
  expect(box!.y + box!.height).toBeLessThanOrEqual(516);
  await page.screenshot({ path: info.outputPath("small-desktop-dialog.png") });
  const controls = page
    .getByTestId("form-surface")
    .locator('input,textarea,button,[tabindex="0"]');
  await controls.last().focus();
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("button", { name: "Create exam", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Discard changes", exact: true }),
  ).toBeVisible();
});

test("editing legacy subtasks preserves dates and normalizes only the saved event", async ({
  page,
}) => {
  await seed(page);
  await page.goto("/event/assignment");
  await page.getByRole("button", { name: "Edit event", exact: true }).click();
  await expect(page.getByLabel("Target date 1", { exact: true })).toHaveValue(
    "2026-11-17",
  );
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  const snapshot = await page.evaluate(
    () => JSON.parse(localStorage.getItem("assignr:v1:local")!).snapshot,
  );
  expect(snapshot.events[0].subtasks[0].target_date).toBe("2026-11-17");
  expect(snapshot.events[0].subtasks[0].target_at).toBeUndefined();
});
