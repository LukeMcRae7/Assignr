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
  await expect(page.getByTestId("editor-types").getByText("Lab")).toHaveCount(
    0,
  );
  await expect(
    page.getByRole("button", { name: "Course Computer Systems", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText("CMPT 295", { exact: true })).toBeVisible();
  await assertFormLayout(page);
  await page.screenshot({ path: info.outputPath("event-editor.png") });
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
  const desktop = (page.viewportSize()?.width || 0) >= 1100;
  const title = page.getByRole("textbox", {
    name: desktop ? "Assignment name" : "Title",
    exact: true,
  });
  if (desktop) {
    await expect(page.getByTestId("editor-course")).toHaveCount(0);
    await title.focus();
    await expect(title).toBeFocused();
  } else {
    await page
      .getByRole("button", { name: "Add assignment", exact: true })
      .click();
  }
  await title.pressSequentially("Unsaved assignment");
  await page.screenshot({ path: info.outputPath("assignment-composer.png") });
  if (desktop)
    await page.getByRole("button", { name: "Collapse", exact: true }).click();
  else
    await page
      .getByTestId("form-header")
      .getByRole("button", { name: "Close", exact: true })
      .click();
  await page.getByRole("button", { name: "Keep editing", exact: true }).click();
  await expect(title).toHaveValue("Unsaved assignment");
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

test("custom types follow their course section and last through the last event using them", async ({
  page,
}) => {
  await seed(page);
  const button = (name: string) =>
    page.getByRole("button", { name, exact: true });
  await page.goto("/courses/course");
  await button("Add assignment").click();
  await expect(button("Lecture")).toHaveCount(0);
  await button("Other").click();
  await page.getByLabel("Type name", { exact: true }).fill("Reading");
  await page.getByLabel("Title", { exact: true }).fill("Week one");
  await page.getByLabel("Due date", { exact: true }).fill("2025-01-15");
  await button("Create reading").click();
  await button("Add assessment").click();
  await expect(button("Reading")).toHaveCount(0);
  await expect(button("Exam")).toBeVisible();
  await button("Close").click();
  await button("Add assignment").click();
  await button("Reading").click();
  await page.getByLabel("Title", { exact: true }).fill("Week two");
  await button("Create reading").click();
  await page.goto("/calendar");
  await button("Calendar visibility").click();
  await expect(button("Reading")).toHaveAttribute("aria-pressed", "true");
  await expect(button("Labs")).toHaveCount(0);
  await button("Reading").click();
  await expect(button("Assignments")).toHaveAttribute("aria-pressed", "true");
  await button("Close").click();
  await page.goto("/courses/course");
  for (const title of ["Week two", "Week one"]) {
    await button("Open " + title).click();
    await button("More event actions").click();
    await button("Delete event").click();
    await page
      .getByRole("dialog")
      .last()
      .getByRole("button", { name: "Delete", exact: true })
      .click();
    await button("Add assignment").click();
    await expect(button("Reading")).toHaveCount(title === "Week two" ? 1 : 0);
    await button("Close").click();
  }
  await page.goto("/calendar");
  await button("Calendar visibility").click();
  await expect(button("Reading")).toHaveCount(0);
});

test("ToDo keeps personal and current tasks first while browsing another semester", async ({
  page,
}) => {
  await seed(page);
  await page.goto("/");
  await page.evaluate(() => {
    const key = "assignr:v1:local";
    const cache = JSON.parse(localStorage.getItem(key)!);
    const { semesters, courses, events } = cache.snapshot;
    for (const [id, name, year] of [
      ["past", "Fall 2025", "2025"],
      ["future", "Fall 2027", "2027"],
    ]) {
      semesters.push({
        ...semesters[0],
        id,
        name,
        start_date: year + "-09-01",
        end_date: year + "-12-18",
      });
      courses.push({
        ...courses[0],
        id,
        name: name + " course",
        semester_id: id,
      });
      events.push({
        ...events[0],
        id,
        course_id: id,
        title: id + " work",
        due_at: year + "-11-01T12:00:00Z",
      });
    }
    events.push({
      ...events[0],
      id: "personal",
      course_id: null,
      title: "Independent reading",
    });
    localStorage.setItem(key, JSON.stringify(cache));
  });
  await page.goto("/courses");
  await page.getByTestId("semester-selector").click();
  await page.getByRole("button", { name: "Fall 2027", exact: true }).click();
  await page.getByRole("link", { name: "ToDo", exact: true }).click();
  await expect(page.getByTestId("semester-selector")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Fall 2027", exact: true }),
  ).toHaveCount(0);
  for (const layout of ["Group by course", "Flat assignment list"]) {
    await page.getByRole("button", { name: layout, exact: true }).click();
    const rows = await page
      .getByRole("button", { name: /^Open / })
      .evaluateAll((rows) => rows.map((row) => row.getAttribute("aria-label")));
    expect(rows.slice(0, 2).sort()).toEqual([
      "Open Independent reading",
      "Open Reading reflection",
    ]);
    expect(rows.slice(2)).toEqual(["Open past work", "Open future work"]);
    await expect(
      page.getByRole("heading", { name: "Fall 2027", exact: true }),
    ).toBeVisible();
  }
});
