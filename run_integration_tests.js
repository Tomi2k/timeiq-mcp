// 1. Set environment variables FIRST before importing any config/tool modules
process.env.TIMEIQ_SUBDOMAIN = "ideasbytcgmbh";
process.env.TIMEIQ_EMAIL = "t.scherman@schild-roth.com";
process.env.TIMEIQ_PASSWORD = "wz6C9mHy9C*J";
process.env.TIMEIQ_DRY_RUN = "false";
process.env.TIMEIQ_LOG_LEVEL = "debug";

// Double check keys since sometimes config maps SUBDOMAIN or TENANT
process.env.TIMEIQ_TENANT = "ideasbytcgmbh";

async function run() {
  console.log("🚀 Setting up imports dynamically...");
  
  // 2. Dynamically import modules now that process.env is set
  const { config } = await import("./dist/config.js");
  const { client } = await import("./dist/client.js");
  const { timeTools } = await import("./dist/tools/time.js");
  const { projectTools } = await import("./dist/tools/projects.js");
  const { peopleTools } = await import("./dist/tools/people.js");
  const { reportTools } = await import("./dist/tools/reports.js");
  const { expenseTools } = await import("./dist/tools/expenses.js");
  const { serviceTools } = await import("./dist/tools/services.js");
  const { timesheetTools } = await import("./dist/tools/timesheets.js");
  const { invoiceTools } = await import("./dist/tools/invoices.js");
  const { notificationTools } = await import("./dist/tools/notifications.js");
  const { settingsTools } = await import("./dist/tools/settings.js");

  console.log("🚀 Starting TimeIQ MCP End-to-End Integration Test Suite...\n");

  const results = [];
  let dummyClient = null;
  let dummyProject = null;
  let dummyServiceCategory = null;
  let dummyService = null;
  let dummyTimeEntry = null;
  let dummyTimer = null;

  async function test(name, fn) {
    console.log(`\nTesting: [${name}]`);
    try {
      const output = await fn();
      console.log(`✅ [${name}] Succeeded!`);
      results.push({ name, status: "SUCCESS", error: null });
      return output;
    } catch (err) {
      console.error(`❌ [${name}] Failed! Error:`, err.message);
      if (err.errors) console.error("Validation Details:", JSON.stringify(err.errors));
      results.push({ name, status: "FAILED", error: err.message });
    }
  }

  // --- 1. People Tools ---
  await test("timeiq_person_list", async () => {
    const list = await peopleTools.timeiq_person_list.handler({ filter: "active" });
    console.log(`Active people count: ${list.people?.length || 0}`);
    return list;
  });

  await test("timeiq_person_get", async () => {
    const person = await peopleTools.timeiq_person_get.handler({ slug: "timothy_scherman" });
    console.log(`Person Name: ${person.people?.[0]?.name}`);
    return person;
  });

  // --- 2. Settings Tools ---
  await test("timeiq_settings_get", async () => {
    const settings = await settingsTools.timeiq_settings_get.handler({});
    console.log(`Settings keys:`, Object.keys(settings.settings || {}));
    return settings;
  });

  // --- 3. Client & Project Creation ---
  dummyClient = await test("timeiq_client_create", async () => {
    const res = await projectTools.timeiq_client_create.handler({
      name: `Dummy Integration Client ${Date.now()}`
    });
    console.log(`Created Client: ${res.clients?.[0]?.name} (Slug: ${res.clients?.[0]?.slug}, ID: ${res.clients?.[0]?.id})`);
    return res.clients?.[0];
  });

  if (dummyClient) {
    await test("timeiq_client_get", async () => {
      return projectTools.timeiq_client_get.handler({ slug: dummyClient.slug });
    });

    await test("timeiq_client_update", async () => {
      const res = await projectTools.timeiq_client_update.handler({
        slug: dummyClient.slug,
        changeset: { name: `${dummyClient.name} UPDATED` }
      });
      // CRITICAL: Slug changes when name is updated! Update dummyClient reference.
      dummyClient = res.clients?.[0] || dummyClient;
      console.log(`Updated Client Name: ${dummyClient.name} (New Slug: ${dummyClient.slug})`);
      return res;
    });

    dummyProject = await test("timeiq_project_create", async () => {
      const res = await projectTools.timeiq_project_create.handler({
        name: `Dummy Integration Project ${Date.now()}`,
        client_id: dummyClient.id,
        is_billable: true
      });
      console.log(`Created Project: ${res.projects?.[0]?.name} (Slug: ${res.projects?.[0]?.slug}, ID: ${res.projects?.[0]?.id})`);
      return res.projects?.[0];
    });
  }

  if (dummyProject) {
    await test("timeiq_project_get", async () => {
      return projectTools.timeiq_project_get.handler({ slug: dummyProject.slug });
    });

    await test("timeiq_project_update", async () => {
      const res = await projectTools.timeiq_project_update.handler({
        slug: dummyProject.slug,
        changeset: { name: `${dummyProject.name} UPDATED` }
      });
      dummyProject = res.projects?.[0] || dummyProject;
      console.log(`Updated Project Name: ${dummyProject.name} (New Slug: ${dummyProject.slug})`);
      return res;
    });
  }

  // --- 4. Service / Task Type Tools ---
  await test("timeiq_service_list", async () => {
    const list = await serviceTools.timeiq_service_list.handler({});
    console.log(`Active services count: ${list.services?.length || 0}`);
    return list;
  });

  await test("timeiq_service_category_list", async () => {
    const list = await serviceTools.timeiq_service_category_list.handler({});
    console.log(`Active service categories count: ${list.serviceCategories?.length || list.servicecategories?.length || 0}`);
    return list;
  });

  // Create a category FIRST because services require a valid category
  dummyServiceCategory = await test("timeiq_service_category_create", async () => {
    const res = await serviceTools.timeiq_service_category_create.handler({
      name: `Dummy Integration Category ${Date.now()}`
    });
    console.log(`Created Category: ${res.serviceCategories?.[0]?.name} (Slug: ${res.serviceCategories?.[0]?.slug})`);
    return res.serviceCategories?.[0];
  });

  if (dummyServiceCategory) {
    dummyService = await test("timeiq_service_create", async () => {
      const res = await serviceTools.timeiq_service_create.handler({
        name: `Dummy Integration Service ${Date.now()}`,
        service_category_id: dummyServiceCategory.id
      });
      console.log(`Created Service: ${res.services?.[0]?.name} (Slug: ${res.services?.[0]?.slug})`);
      return res.services?.[0];
    });
  }

  if (dummyService) {
    await test("timeiq_service_archive", async () => {
      return serviceTools.timeiq_service_archive.handler({ slug: dummyService.slug });
    });
  }

  // --- 5. Time Entry Tools (with start/end times since Timothy uses start_and_end_time) ---
  if (dummyProject) {
    const today = new Date().toISOString().split("T")[0];

    dummyTimeEntry = await test("timeiq_time_create", async () => {
      const res = await timeTools.timeiq_time_create.handler({
        date: today,
        project_id: dummyProject.id,
        start_time: `${today} 09:00:00`,
        end_time: `${today} 09:30:00`,
        notes: "MCP End-to-End Test Entry",
        is_billable: true
      });
      console.log(`Created Entry: ${res.time?.[0]?.id} (Duration: ${res.time?.[0]?.duration} min)`);
      return res.time?.[0];
    });

    if (dummyTimeEntry) {
      await test("timeiq_time_update", async () => {
        const res = await timeTools.timeiq_time_update.handler({
          id: dummyTimeEntry.id,
          changeset: { notes: "MCP End-to-End Test Entry UPDATED" }
        });
        console.log(`Updated Entry Notes: ${res.time?.[0]?.notes}`);
        return res;
      });
    }

    // --- 6. Timer (Stopwatch) Tools ---
    // Make sure to clean up any existing running timer first so we can start ours cleanly
    await test("timeiq_timer_cancel_existing_if_any", async () => {
      try {
        await timeTools.timeiq_timer_cancel.handler({});
        console.log("Cancelled existing active timer.");
      } catch {
        console.log("No existing active timer running.");
      }
    });

    dummyTimer = await test("timeiq_timer_start", async () => {
      const res = await timeTools.timeiq_timer_start.handler({
        project_id: dummyProject.id,
        notes: "MCP Running stopwatch test"
      });
      console.log("Full started timer response:", JSON.stringify(res, null, 2));
      return res.timers?.[0];
    });

    if (dummyTimer) {
      await test("timeiq_timer_get", async () => {
        return timeTools.timeiq_timer_get.handler({});
      });

      await test("timeiq_timer_update", async () => {
        return timeTools.timeiq_timer_update.handler({
          id: dummyTimer.id,
          changeset: { notes: "MCP Running stopwatch test UPDATED" }
        });
      });

      await test("timeiq_timer_stop", async () => {
        const res = await timeTools.timeiq_timer_stop.handler({
          notes: "MCP Stopped stopwatch test entry"
        });
        console.log(`Stopped timer, created Time Entry ID: ${res.time?.[0]?.id}`);
        // Let's delete this stopped timer time entry immediately so we don't pollute database
        if (res.time?.[0]?.id) {
          await timeTools.timeiq_time_delete.handler({ id: res.time[0].id });
          console.log(`Deleted stopped stopwatch time entry ${res.time[0].id}`);
        }
        return res;
      });
    }
  }

  // --- 7. Report Tools ---
  await test("timeiq_report_standard", async () => {
    const today = new Date().toISOString().split("T")[0];
    const res = await reportTools.timeiq_report_standard.handler({
      start_date: today,
      end_date: today
    });
    console.log(`Standard report results summary keys:`, Object.keys(res));
    return res;
  });

  await test("timeiq_report_search_time", async () => {
    const today = new Date().toISOString().split("T")[0];
    const res = await reportTools.timeiq_report_search_time.handler({
      start_date: today,
      end_date: today
    });
    console.log(`Standard time report entries count: ${res.time_ids?.length || 0}`);
    return res;
  });

  // --- 8. Expense Tools ---
  await test("timeiq_expense_type_list", async () => {
    const list = await expenseTools.timeiq_expense_type_list.handler({});
    console.log(`Expense types count: ${list.expensetypes?.length || 0}`);
    return list;
  });

  await test("timeiq_expense_category_list", async () => {
    const list = await expenseTools.timeiq_expense_category_list.handler({});
    console.log(`Expense categories count: ${list.expensecategories?.length || 0}`);
    return list;
  });

  // --- 9. Invoice Tools ---
  await test("timeiq_invoice_list", async () => {
    const list = await invoiceTools.timeiq_invoice_list.handler({});
    console.log(`Invoices count: ${list.invoices?.length || 0}`);
    return list;
  });

  // --- 10. Clean up / Archive & Delete ---
  if (dummyTimeEntry) {
    await test("timeiq_time_delete", async () => {
      return timeTools.timeiq_time_delete.handler({ id: dummyTimeEntry.id });
    });
  }

  if (dummyProject) {
    await test("timeiq_project_archive", async () => {
      return projectTools.timeiq_project_archive.handler({ slug: dummyProject.slug });
    });

    await test("timeiq_project_delete", async () => {
      return projectTools.timeiq_project_delete.handler({ slug: dummyProject.slug });
    });
  }

  if (dummyService) {
    await test("timeiq_service_delete", async () => {
      return serviceTools.timeiq_service_delete.handler({ slug: dummyService.slug });
    });
  }

  if (dummyServiceCategory) {
    await test("timeiq_service_category_archive", async () => {
      return serviceTools.timeiq_service_category_archive.handler({ slug: dummyServiceCategory.slug });
    });

    await test("timeiq_service_category_delete", async () => {
      return serviceTools.timeiq_service_category_delete.handler({ slug: dummyServiceCategory.slug });
    });
  }

  if (dummyClient) {
    await test("timeiq_client_archive", async () => {
      return projectTools.timeiq_client_archive.handler({ slug: dummyClient.slug });
    });

    await test("timeiq_client_delete", async () => {
      return projectTools.timeiq_client_delete.handler({ slug: dummyClient.slug });
    });
  }

  // --- Print Final Summary ---
  console.log("\n=============================================");
  console.log("📊 INTEGRATION TEST SUITE SUMMARY");
  console.log("=============================================");
  const succeeded = results.filter(r => r.status === "SUCCESS");
  const failed = results.filter(r => r.status === "FAILED");
  console.log(`Total Succeeded: ${succeeded.length}`);
  console.log(`Total Failed: ${failed.length}`);

  if (failed.length > 0) {
    console.log("\n❌ Failed Tests Detail:");
    failed.forEach(f => console.log(`- ${f.name}: ${f.error}`));
    process.exit(1);
  } else {
    console.log("\n🎉 ALL TESTS PASSED SUCCESSFULLY!");
    process.exit(0);
  }
}

run().catch(console.error);
