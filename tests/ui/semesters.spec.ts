import { test, expect } from "@playwright/test";

test("semester setup, switching, date edits, and history keep standalone plans visible", async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date("2026-11-17T20:00:00Z"));
  await page.goto("/courses");
  await page
    .getByRole("button", { name: "Create your first course", exact: true })
    .click();
  await page.getByLabel("Semester name", { exact: true }).fill("Fall 2026");
  await page.getByLabel("Teaching starts", { exact: true }).fill("2026-09-01");
  await page.getByLabel("Teaching ends", { exact: true }).fill("2026-12-18");
  await page
    .getByRole("button", { name: "Create semester", exact: true })
    .click();
  await page.getByLabel("Course name", { exact: true }).fill("Algorithms");
  await page
    .getByRole("button", { name: "Create course", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Manage classes", exact: true })
    .click();
  await expect(page.getByLabel("Class timezone", { exact: true })).toHaveCount(
    0,
  );
  await expect(page.getByLabel("Term starts", { exact: true })).toHaveCount(0);
  await page.getByLabel("Title", { exact: true }).fill("Lecture");
  await page.getByRole("button", { name: "Create event", exact: true }).click();
  await page
    .getByRole("button", { name: "Add assignment", exact: true })
    .click();
  await page.getByLabel("Title", { exact: true }).fill("Past semester work");
  await page.getByRole("button", { name: "Create event", exact: true }).click();
  await page.getByRole("link", { name: "Courses", exact: true }).click();
  await page.getByRole("button", { name: "Fall 2026", exact: true }).click();
  await page.getByRole("button", { name: "Add semester", exact: true }).click();
  await page.getByLabel("Semester name", { exact: true }).fill("Spring 2027");
  await page.getByLabel("Teaching starts", { exact: true }).fill("2027-01-04");
  await page.getByLabel("Teaching ends", { exact: true }).fill("2027-04-16");
  await page
    .getByRole("button", { name: "Create semester", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Open Algorithms", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Spring 2027", exact: true }).click();
  await page
    .getByRole("button", { name: "Edit Fall 2026", exact: true })
    .click();
  await page.getByLabel("Teaching ends", { exact: true }).fill("2026-11-16");
  await expect(
    page.getByRole("button", { name: "Delete semester", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Save semester", exact: true })
    .click();
  await page.getByRole("link", { name: "ToDo", exact: true }).click();
  await expect(
    page.getByText("Unfinished from past semesters", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Open Past semester work", exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Today", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Open Lecture", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Add event", exact: true }).click();
  await page.getByLabel("Title", { exact: true }).fill("Independent plan");
  await page.getByRole("button", { name: "Create event", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Open Independent plan", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Open Independent plan", exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Settings", exact: true }).click();
  await expect(page.getByText("Campus timezone", { exact: true })).toHaveCount(
    0,
  );
  await page.getByText("Default due time", { exact: true }).click();
  await page.getByLabel("Default due time", { exact: true }).fill("18:45");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("6:45 PM", { exact: true })).toBeVisible();
});

test("existing courses keep their schedule until semester assignment is reviewed", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const base = { user_id: "local", version: 0, deleted_at: null };
    const course = {
      ...base,
      id: "legacy-course",
      name: "Existing course",
      code: "OLD 101",
      professor: "",
      website: "",
      position: 0,
      color: "#485BC4",
      icon: "server",
    };
    const event = {
      ...base,
      id: "legacy-class",
      course_id: course.id,
      title: "Existing lecture",
      kind: "lecture",
      starts_at: null,
      ends_at: null,
      due_at: null,
      location: "",
      notes: "",
      priority: null,
      completed: false,
      subtasks: [],
      parent_event_id: null,
      occurrence_date: null,
      cancelled: false,
      recurrence: {
        days: [2],
        start_date: "2026-09-01",
        end_date: "2026-12-18",
        start_time: "09:30",
        end_time: "10:30",
        timezone: "America/Toronto",
      },
    };
    if (!localStorage.getItem("assignr:v1:local"))
      localStorage.setItem(
        "assignr:v1:local",
        JSON.stringify({
          schema: 1,
          snapshot: { courses: [course], events: [event], preferences: [] },
          queue: [],
        }),
      );
  });
  await page.goto("/courses");
  await page
    .getByRole("button", {
      name: "Assign semester · Existing course",
      exact: true,
    })
    .click();
  await page
    .getByLabel("Semester name", { exact: true })
    .fill("Mapped semester");
  await page
    .getByRole("button", { name: "Create semester", exact: true })
    .click();
  await expect(page.getByText(/Previously: 2026-09-01/)).toBeVisible();
  await expect(page.getByText(/Saving applies this semester/)).toBeVisible();
  await page.getByRole("button", { name: "Save course", exact: true }).click();
  await expect(
    page.getByRole("button", {
      name: "Assign semester · Existing course",
      exact: true,
    }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Open Existing course", exact: true }),
  ).toBeVisible();
  const cached = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("assignr:v1:local")!),
  );
  expect(cached.schema).toBe(2);
  expect(cached.snapshot.events[0].recurrence.timezone).toBe("America/Toronto");
  expect(cached.snapshot.courses[0].semester_id).toBe(
    cached.snapshot.semesters[0].id,
  );
});
