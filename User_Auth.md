User Auth

(done)
 Unauthenticated access redirects to Login Step: In a fresh browser session (logged out), open /dashboard (or any /dashboard/... URL like /dashboard/customers). Expected: You are redirected to /login. Data integrity check: Browser URL becomes /login and the login form is visible.



(done)
 Sign in (valid credentials) redirects to Dashboard Step: Go to /login. Enter your Email and Password, then click Sign in. Expected: You are redirected to /dashboard (or callbackUrl if present in the login URL). Data integrity check: Sidebar navigation appears and the page shows the Dashboard header.


(done)
 Sign in (invalid credentials) shows error Step: Go to /login. Enter an invalid Email (or invalid password), then click Sign in. Expected: A form error banner appears with the exact text Invalid email or password.; the submit button returns to Sign in. Data integrity check: URL stays on /login (no redirect).

(done)
 Sign out Step: On any authenticated page, click Sign out in the header. Expected: You are redirected to /. Data integrity check: The home page shows Renew CRM and a Sign in link.

(done)
Dashboard

 Dashboard loads and shows the 4 preview modules Step: Sign in, then open /dashboard. Expected: You see the Dashboard header and 4 titled cards/sections: Renewals due this week, Tasks due today, Recent activity, Recent documents. Data integrity check: Each section shows either a list of up to 5 rows or an empty-state message with an action link.


 Dashboard “View all” navigation Step: On /dashboard, click each View all link in these cards:

Renewals due this week → View all
Tasks due today → View all
Recent activity → View all
Recent documents → View all Expected: Each click navigates to the corresponding list page. Data integrity check: The destination page header matches the target (e.g., Renewals, Tasks, Activities, Documents).


(done)
 Cross-module preview update (create data, then refresh Dashboard) Step:


Create a customer (see Customers section below).
From the customer workspace, add:
a policy with a Renewal date set so it lands in the “next 7 days” bucket (see Policies/Renewals checklist),
a task with Due date set to today and Status set to Pending or In progress (not Done/Cancelled),
an activity (any Type, optionally add Subject and notes),
upload a document (see Documents checklist).
Return to /dashboard (refresh if needed). Expected: Each corresponding dashboard section includes the newly created item (within the “top 5” preview limits). Data integrity check:
Renewals section shows the policy row with the correct policy number/status/bucket behavior.
Tasks due today includes the new task.
Recent activity includes the new activity.
Recent documents includes the new document.
Customers (List / Add / Edit / Detail)

 Customers list loads Step: In the sidebar, click Customers (or open /dashboard/customers). Expected: You see the Customers page with a table of customers or an inline empty state (No customers yet). Data integrity check: Column headers match the page (Customer, Type, Contact, Status, Owner, Action).

(done)
 Customer filters: Apply + Clear Step:

On /dashboard/customers, fill the top filters in CustomerSearchForm:
Search (e.g., part of a name/email/phone),
Status,
Type.
Click Apply. Expected: The results update to match the filters. Data integrity check: URL includes the relevant query params and the Clear link appears; clicking Clear returns to /dashboard/customers with no filters.

 Customers pagination Step: If Previous/Next buttons appear, click Next, then click Previous. Expected: Page navigation works. Data integrity check: The “Page X of Y (Z total)” text updates and results change.

(done)

 Add customer Step:

On /dashboard/customers, click Add customer.
Fill CustomerForm:
Name (required),
Type,
Status,
optional Email, Phone, Address,
Owner broker (optional; can select — None —).
Click Create customer. Expected: You are redirected to the new customer detail page. Data integrity check: The customer header shows the new customer name, and the Overview detail section shows the entered fields.

(done)

 Edit customer Step:

Open a customer detail page.
Click Edit customer.
Change at least one field (e.g., Status or Owner broker) and click Save changes. Expected: You are redirected back to the customer detail page. Data integrity check: The updated fields are reflected in the Overview section and header description.
Customer Workspace Management (per-customer sections)
Contact persons

(done)
 Add contact Step:

Open a customer detail page.
In Contact persons, click Add contact.
Fill the ContactForm:
Name (required),
optional Email, Phone, Title / role,
optionally check Primary contact.
Click Add contact. Expected: The form closes and the contact appears in the list. Data integrity check: The contact list shows the new name; if you checked Primary contact, it displays the Primary badge.

(done)

 Set primary contact Step:

In Contact persons, find a contact that is not primary (no Primary badge).
Click Set primary. Expected: The primary badge moves to the selected contact. Data integrity check: Exactly one contact should display Primary after the update.

(done)

 Edit contact Step:

In Contact persons, click Edit next to a contact.
Modify fields (e.g., Title / role or Email) and click Save changes. Expected: The edit form closes and the list updates. Data integrity check: The updated values are reflected in the contact row.

(done)
 Delete contact (modal confirm) Step:

Click Delete next to a contact.
In the confirm dialog, click Remove. Expected: The dialog closes; the contact is removed from the list. Data integrity check: The deleted contact name no longer appears under Contact persons.

(doen)

 Delete contact (modal cancel via overlay) Step:

Click Delete next to a contact.
Click the dark overlay/background outside the dialog (or click Cancel). Expected: The dialog closes and no deletion occurs. Data integrity check: The contact list remains unchanged.
Insured objects

(done)
 Add insured object Step:

In Insured objects, click Add object.
Fill InsuredObjectForm:
Type (required),
Name (required),
optional Description.
Click Add insured object. Expected: Form closes; new object appears. Data integrity check: The new object shows its Name and a type badge (e.g., Property, Vehicle, etc.).

(done)
 Edit insured object Step:

Click Edit next to an insured object.
Change fields and click Save changes. Expected: Form closes and the list updates. Data integrity check: The updated name/type/description is reflected.

(done)
 Delete insured object (modal confirm) Step:

Click Delete next to an object.
In the confirm dialog, click Remove. Expected: Dialog closes and object disappears from list. Data integrity check: The deleted object is no longer visible under Insured objects.
Policies (customer workspace)

(done)

 Add policy (including “Add insurer” inline) Step:

In Policies, click Add policy.
In PolicyForm:
select an Insurer OR add a new one:
type a new insurer name in the “New insurer name” field,
click Add insurer,
ensure the Insurer dropdown now reflects the new insurer.
fill Policy number (required),
fill Start date and End date (required),
optionally fill Renewal date,
set Status.
if Link to insured objects is shown, select at least one checkbox.
Click Add policy. Expected: Policy form closes and the policy appears in the list. Data integrity check:
The policies list row shows the correct Policy number.
Status badge shows the correct label (Active, Pending, Expired, Cancelled).
If you selected insured objects, the row displays Objects: ....

(done)
 Edit policy inline Step:

In Policies, click Edit for a policy.
Change at least one field (e.g., Renewal date or Status) and click Save changes. Expected: Form closes and row updates. Data integrity check: Updated renewal date/status are reflected in the row’s displayed dates/badge.

(done)
 Delete policy (modal confirm) Step:

In Policies, click Delete for a policy.
In the confirm dialog, click Delete. Expected: Dialog closes and the policy is removed from the list. Data integrity check: The deleted policy number no longer appears under Policies.

(done)
 Edit policy via Policy detail “Edit policy” deep-link Step:

Click View for a policy (from the customer Policies list) to go to the policy detail page.
Click Edit policy. Expected: You return to the customer page and the Policies section shows the policy edit form (not the list). Data integrity check: The PolicyForm fields are prefilled, and the submit button reads Save changes.
Documents (customer workspace)

(done)
 Upload document (happy path) Step:

In Documents, click Upload document (button label changes to Cancel when form is open).
In the upload form:
select a file in File (required; PDF/images/Word/text/CSV; <= 20 MB),
optionally set Display name,
set Type,
if available, optionally set Link to policy,
click Upload. Expected: The form closes; uploaded file appears in the documents list. Data integrity check:
The documents list shows the new Display name (or falls back to original filename if name not provided),
the type badge matches the selected Type,
size and uploaded date are displayed.

(done)
 Upload document form cancel Step:

Click Upload document.
Click Cancel. Expected: The form hides and the documents list remains. Data integrity check: No new document appears.

(done)
 Upload document validation: missing file Step:

Click Upload document.
Without selecting a file, click Upload. Expected: Browser/form validation prevents upload (and/or the error banner shows). Data integrity check: No network-success state occurs; documents list does not change.

(done)
 Upload document validation: server errors (max size / disallowed type) Step:

Try uploading a disallowed file type or a file larger than 20 MB.
Click Upload. Expected: An inline error banner appears (from data.error), using one of the server messages:
File too large (max 20 MB) or
File type not allowed. Allowed: PDF, images, Word, text, CSV. or
A file is required (if applicable). Data integrity check: The documents list does not add the rejected file.

 Download document Step: In Documents, click Download for an uploaded item. Expected: A new tab initiates a download (Content-Disposition: attachment). Data integrity check: The download filename matches the document name shown in the list.

(done)

 Delete document (modal confirm) Step:

In Documents, click Delete for a document.
In the confirm dialog, click Delete. Expected: Dialog closes and the document is removed from the list. Data integrity check: The deleted document name no longer appears.
Activities (customer workspace)

(done)
 Log activity Step:

In Activities, click Log activity.
In ActivityForm, set:
Type,
optional Subject,
optional notes in Notes.
Click Add activity. Expected: Form closes; new activity appears in the list. Data integrity check:
Badge shows Type label (e.g., Call, Meeting, Email, Note, Advice),
if you entered Subject/notes, they render in the row.

(done)
 Edit activity Step:

In Activities, click Edit.
Change fields and click Save changes. Expected: Form closes and activity updates in list. Data integrity check: Updated subject/body reflect in the row.

(done)
 Delete activity (modal confirm) Step:

Click Delete next to an activity.
In the confirm dialog, click Delete. Expected: Dialog closes; activity removed. Data integrity check: The deleted activity no longer appears.
Tasks (customer workspace)

(done)
 Add task Step:

In Tasks & reminders, click Add task.
Fill TaskForm:
Title (required),
optional Description,
set Due date,
set Priority,
set Status,
optionally set Assign to (or leave — Unassigned —).
Click Create task. Expected: Form closes; task appears in the list. Data integrity check:
Status badge label matches (Pending, In progress, Done, Cancelled),
priority badge shows High when Priority is HIGH.

(done)
 Edit task Step:

In Tasks & reminders, click Edit for the task.
Change Due date and/or Status, click Save changes. Expected: Form closes; list updates. Data integrity check: The row’s displayed due date (and overdue marker if applicable) and status badge are updated.

(done)
 Delete task (modal confirm) Step:

Click Delete next to a task.
Confirm in the dialog by clicking Delete. Expected: Dialog closes; task removed. Data integrity check: Task no longer appears in the customer’s Tasks & reminders.



(done)
Policies (Global list + Policy detail)

 Global Policies list loads Step: In the sidebar, click Policies (open /dashboard/policies). Expected: You see the Policies header, a search/filter toolbar, and a table (or inline empty state). Data integrity check: Columns include Customer, Policy number, Insurer, Status, Premium, Start, End, Renewal, Broker, Action.

(done)

 Policies search/filter: Apply + Clear Step:

Enter Search text (policy number/customer/insurer search text per placeholder),
optionally select Status,
click Apply,
click Clear. Expected: Results narrow after Apply; full list returns after Clear. Data integrity check: URL query parameters update accordingly.

(done)

 Navigate to Policy detail from table Step: In the policies table, click the View link for a policy row. Expected: You open the Policy detail page showing policy number header and sections. Data integrity check: The policy number displayed matches the clicked row’s Policy number.

(done)

 Policy detail: Edit policy deep-link opens inline edit Step:

On a policy detail page, click Edit policy. Expected: You land back on the customer page and the relevant Policies section shows the policy edit form. Data integrity check: The PolicyForm is shown with values already filled, and the action button reads Save changes.

(done)

 Policy detail: Linked documents display Step:

On a policy detail page, scroll to the Documents section (provided by PolicyDocumentsSection).
If there are linked docs, click Download for one item. Expected: A download starts in a new tab. Data integrity check: Filename matches the displayed document name.

(done)

 Policy detail: Delete linked document (modal confirm) Step:

In the policy detail Documents section, click Delete.
In the confirm dialog, click Delete. Expected: Dialog closes and linked document disappears after refresh. Data integrity check: The documents list no longer includes the deleted document.
Renewals

(done)

 Renewals page loads and shows bucketed sections Step: In the sidebar, click Renewals (open /dashboard/renewals). Expected: You see Renewals header and bucket sections: Overdue, Next 7 days, Next 30 days, Next 90 days, Later, Missing renewal date (some may be empty cards). Data integrity check: Each row has a status badge (e.g., Active/Pending) and a displayed renewal date (or — if missing).

(done)

 Renewals filter by Broker + Status Step:

In the toolbar, set Broker and/or Status,
click Apply,
verify the Clear button appears,
click Clear. Expected: List results narrow after Apply; return to unfiltered view after Clear. Data integrity check: Rows match the selected broker and/or status.

 Renewals “View” navigation Step: In any bucket section, click the row View link. Expected: You open the policy detail page for that policy. Data integrity check: Policy detail header policy.policyNumber matches the selected renewal row.

 (done)

Tasks (Global task queue)

 Tasks page loads with 4 partitions Step: In the sidebar, click Tasks (open /dashboard/tasks). Expected: You see partitions with headings: Overdue, Due soon, Open, Completed. Data integrity check: Completed items are based on Status being Done or Cancelled.



(done)

 Due-date classification (create tasks, then verify sections) Step:

On a customer page, add tasks with different combinations:
Task A: Due date = today, Status = Pending (or In progress)
Task B: Due date = yesterday, Status = Pending
Task C: Due date = tomorrow, Status = Pending
Task D: Due date = yesterday, Status = Done (or Cancelled)
Return to /dashboard/tasks. Expected:
Task A appears under Due soon (since due date <= today+7 and not completed),
Task B appears under Overdue,
Task C appears under Due soon (if within 7 days),
Task D appears under Completed. Data integrity check: Each task row’s status badge, due date display, and section placement match the logic in TasksPage.

 Tasks “View” navigation Step: In any tasks table, click View for a task row. Expected: You navigate to the corresponding customer detail page. Data integrity check: The customer shown matches the task row’s customer name.

(done)

Activities (Global feed)

 Activities page loads Step: In the sidebar, click Activities (open /dashboard/activities). Expected: You see filters (Type, Broker, Date range) and a table with columns: Type, Title, Customer, Created by, Created, Action. Data integrity check: If there are no results, an inline state appears with either No activities yet or No matches depending on whether filters are active.



(done)
 Activities filters: Apply + Clear + Pagination Step:

Use ActivityFilters:
set Type to one you created,
set Broker to yourself (select the broker option matching your session email/name),
optionally set Date range to Last 7 days,
click Apply.
If pagination appears, click Next and then Previous.
click Clear if it appears. Expected: Results narrow after Apply, paging works, and Clear returns to unfiltered feed. Data integrity check:
Rows match the chosen type/broker/range.
Pagination text updates (Page X of Y and total).
Clear removes query params and shows the broader list/empty-state appropriate for your data.

(done)

 Activities “View” navigation Step: From a feed row, click the row View link. Expected: You navigate to the related customer detail page. Data integrity check: Customer name matches the Customer column in the selected activity row.


(done)

Documents (Global list)

 Documents page loads Step: In the sidebar, click Documents (open /dashboard/documents). Expected: You see Documents header, the DocumentFilters form, and a table with columns: Name, Type, Customer, Policy, Uploaded, Action. Data integrity check: Document type badges use the DOCUMENT_TYPE_LABELS values (e.g., Policy document, Contract, etc.).

(done)

 Documents filters: Apply + Clear Step:

Set Customer to the customer you uploaded a doc for.
Optionally set Type and Uploaded (Last 7 days / Last 30 days).
Optionally fill Search name.
Click Apply.
Click Clear. Expected: Table updates to match filters, then returns to unfiltered view. Data integrity check: URL query params update and the returned document list changes accordingly.

 Documents pagination Step: If pagination controls appear, click Next then Previous. Expected: The results page changes. Data integrity check: “Page X of Y (Z total)” updates.

(done)

 Documents row actions: Download + View (anchor) Step:

In a document row, click Download.
Then click View in the same row. Expected:
Download opens a new tab and starts attachment download.
View navigates to /dashboard/customers/{id}#documents. Data integrity check: After clicking View, you’re scrolled to the Documents section header on that customer page.
Settings (Profile / Password / Brokerage)

 Settings route redirect Step: Open /dashboard/settings while authenticated. Expected: You are redirected to /dashboard/settings/profile. Data integrity check: The page title/section is Profile.

(done)

 Profile update Step:

Go to /dashboard/settings/profile.
Edit Display name.
Click Save changes. Expected: A success message appears: Profile updated. Data integrity check: The saved display name persists after refresh.

(done)

 Change password (invalid current password) Step:

Go to /dashboard/settings/password.
Enter an incorrect Current password, set any values for New password and Confirm new password, then click Change password. Expected: An error banner shows Invalid current password (or Validation failed if schema validation fails). Data integrity check: Password fields remain filled/cleared according to the error path (it only clears on success).

(done)

 Change password (success) Step:

Go to /dashboard/settings/password.
Enter the correct Current password.
Enter a new New password and matching Confirm new password.
Click Change password. Expected: Success message appears: Your password has been updated.; all three password inputs are cleared. Data integrity check: Re-login with the new password should work (after signing out).

(done)

 Brokerage access (authenticated) Step:

While signed in, open /dashboard/settings/brokerage (or use Organisation → Mäklarkontor in settings). Expected: The brokerage page loads (no redirect to profile solely based on role). Data integrity check: Organisation / Mäklarkontor appears in settings navigation for the same user.


(done)

 Brokerage update Step:

Open /dashboard/settings/brokerage (or use the Brokerage link in settings navigation).
Edit Brokerage name.
Click Save changes. Expected: Success message appears: Brokerage name updated. Data integrity check: Updated name persists after refresh.