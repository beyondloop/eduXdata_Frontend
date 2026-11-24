const API_BASE = (import.meta.env.VITE_API_URL || "/api/v1").replace(/\/$/, "");
export function getClasses() { return request('/classes'); }
export function getSyllabusSubjects() { return request('/syllabus-subjects'); }
export function saveSyllabusSubjects(entry) { return request('/syllabus-subjects', { method: 'PUT', body: JSON.stringify(entry) }); }
export function getSections() { return request('/sections'); }
export function createClass(entry) { return request('/classes', { method: 'POST', body: JSON.stringify(entry) }); }
export function createSection(entry) { return request('/sections', { method: 'POST', body: JSON.stringify(entry) }); }
export function getSyllabuses() { return request('/syllabuses'); }
export function getSyllabusDocuments() { return request('/syllabuses/documents'); }
export function downloadSyllabusDocument(id) { return request(`/syllabuses/documents/${id}/file`, { responseType: 'blob' }); }
export function publishClassSyllabusPdf(className, academicYear, period, file) { const body=new FormData(); body.append('file',file); body.append('className',className); body.append('academicYear',academicYear); body.append('period',period); return request('/syllabuses/documents',{method:'POST',body}); }
export function extractSyllabusSubjects(file, className, sectionName) {
  const form = new FormData();
  form.append('file', file); form.append('className', className); form.append('sectionName', sectionName);
  return request('/syllabuses/extract-subjects', { method: 'POST', body: form });
}
export function createSyllabus(syllabus, file) {
  const form = new FormData();
  form.append('syllabus', new Blob([JSON.stringify(syllabus)], { type: 'application/json' }));
  if (file) form.append('file', file);
  return request(syllabus.subjects ? '/syllabuses/annual' : '/syllabuses', { method: 'POST', body: form });
}
export function downloadSyllabus(id) { return request(`/syllabuses/${id}/file`, { responseType: 'blob' }); }
export function updateSyllabusTopic(id, topic) { return request(`/syllabuses/topics/${id}`, { method: 'PUT', body: JSON.stringify(topic) }); }
export function completeSyllabusTopic(id) { return request(`/syllabuses/topics/${id}/complete`, { method: 'POST', body: JSON.stringify({ completed: true }) }); }
export function addSyllabusNote(id, body) { return request(`/syllabuses/topics/${id}/notes`, { method: 'POST', body: JSON.stringify({ body }) }); }
export function getDiscipline() { return request('/discipline'); }
export function getDisciplineTypes() { return request('/discipline/types'); }
export function submitDiscipline(entry) { return request('/discipline/batch', { method: 'POST', body: JSON.stringify(entry) }); }
export function getDisciplineRequests() { return request('/discipline/requests'); }
export function decideDiscipline(id, approve) { return request(`/discipline/${id}/decision`, { method: 'POST', body: JSON.stringify({ approve }) }); }
export function addDiscipline(entry) { return request('/discipline', { method: 'POST', body: JSON.stringify(entry) }); }
export function getAdjustments() { return request('/teacher-adjustments'); }
export function getAdjustmentTeachers() { return request('/teacher-adjustments/teachers'); }
export function requestAdjustment(entry) { return request('/teacher-adjustments', { method: 'POST', body: JSON.stringify(entry) }); }
export function decideAdjustment(id, approve) { return request(`/teacher-adjustments/${id}/decision`, { method: 'POST', body: JSON.stringify({ approve }) }); }

async function request(path, options = {}) {
  // Login and registration must work even when the saved session has expired.
  const token = path === "/auth/login" ? null : localStorage.getItem("edura_access_token");
  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      },
    });
  } catch (error) {
    if (error.name === "AbortError") throw error;
    throw new Error("Cannot connect to the server. Check your connection and make sure the backend is running.");
  }

  if (!response.ok) {
    if ([502, 503, 504].includes(response.status)) {
      throw new Error("The backend is unavailable. Make sure it is running and try again.");
    }
    const responseText = await response.text();
    const authenticationError = response.status === 401 ? response.headers.get("X-Auth-Error") : "";
    let errorMessage = responseText;
    try {
      const errorBody = JSON.parse(responseText);
      errorMessage = errorBody.detail || errorBody.message || responseText;
    } catch {
      // Some endpoints return a plain-text error response.
    }
    const fallback = response.status === 401
      ? (path.startsWith("/auth/") ? "Sign-in failed. Check your user ID and password." : "Your session is expired or invalid. Sign out and sign in again to continue.")
      : `Request failed (${response.status})`;
    throw new Error(authenticationError || errorMessage || fallback);
  }
  return response.status === 204 ? null : options.responseType === "blob" ? response.blob() : response.json();
}

export async function signIn(username = "admin@springfield.edu", password = "local-dev", role = "ADMIN") {
  const result = await request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password, role }),
  });
  localStorage.setItem("edura_access_token", result.accessToken);
  localStorage.setItem("edura_user", JSON.stringify(result));
  return result;
}

export async function registerAccount(account) {
  return request("/auth/register", { method: "POST", body: JSON.stringify(account) });
}

export function clearSession() { localStorage.removeItem("edura_access_token"); localStorage.removeItem("edura_user"); }

export function getDashboardSummary() { return request("/dashboard/summary"); }
export function getTenantContext() { return request("/tenant/context"); }
export function getAdminOverview() { return request("/admin/overview"); }
export function getAdminSubjects() { return request("/admin/subjects"); }
export function getAcademicOptions() { return request("/admin/academics"); }
export function saveAcademicYear(entry) { return request("/admin/academics/years", { method: "POST", body: JSON.stringify(entry) }); }
export function createAcademicSubject(name) { return request("/admin/academics/subjects", { method: "POST", body: JSON.stringify({ name }) }); }
export function createExam(entry) { return request("/admin/academics/exams", { method: "POST", body: JSON.stringify(entry) }); }
export function saveExamResult(entry, id) { return request(`/admin/academics/results${id ? `/${id}` : ""}`, { method: id ? "PUT" : "POST", body: JSON.stringify(entry) }); }
export function getSeparations() { return request("/admin/separations"); }
export function getSeparationTemplates() { return request("/admin/separations/templates"); }
export function addSeparationTemplate(entry) { return request("/admin/separations/templates", { method: "POST", body: JSON.stringify(entry) }); }
export function createSeparation(entry) { return request("/admin/separations", { method: "POST", body: JSON.stringify(entry) }); }
export function updateSeparationItem(id, itemId, completed) { return request(`/admin/separations/${id}/items/${itemId}`, { method: "PUT", body: JSON.stringify({ completed }) }); }
export function completeSeparation(id) { return request(`/admin/separations/${id}/complete`, { method: "POST" }); }
export function getAdminProfile() { return request("/admin/profile"); }
export function saveAdminProfile(profile) { return request("/admin/profile", { method: "PUT", body: JSON.stringify(profile) }); }
export function getPortalPermissions() { return request("/admin/permissions"); }
export function getPortalPermissionUsers() { return request("/admin/permissions/users"); }
export function savePortalPermissions(assignment) { return request("/admin/permissions", { method: "PUT", body: JSON.stringify(assignment) }); }
export function getMyPortalPermissions() { return request("/permissions/me"); }
export function getStudentProfile() { return request("/student/profile"); }
export function getMyUpcomingExams() { return request("/student/exams"); }
export function getExamTimetable() { return request("/exam-timetable"); }
export function getExamTimetableTemplate() { return request("/exam-timetable/template", { responseType: "blob" }); }
export function uploadExamTimetable(term, file) { const body = new FormData(); body.append("file", file); return request(`/exam-timetable?term=${encodeURIComponent(term)}`, { method: "POST", body }); }
export function downloadExamTimetable(term) { return request(`/exam-timetable/file?term=${encodeURIComponent(term)}`, { responseType: "blob" }); }
export function saveStudentProfile(profile) { return request("/student/profile", { method: "PUT", body: JSON.stringify(profile) }); }
export function getAdminRecords(type, from = "", to = "") { const params = new URLSearchParams(); if (from) params.set("from", from); if (to) params.set("to", to); return request(`/admin/records/${encodeURIComponent(type)}?${params}`); }
export function getStudentInsights(id) { return request(`/admin/students/${encodeURIComponent(id)}/insights`); }
export function uploadStudentDocument(studentId, file) { const body = new FormData(); if (studentId) body.append("studentId", studentId); body.append("file", file); return request("/admin/documents", { method: "POST", body }); }
export function downloadStudentDocument(id) { return request(`/admin/documents/${encodeURIComponent(id)}/file`, { responseType: "blob" }); }
export function getStudents(query = "") { return request(`/students${query ? `?q=${encodeURIComponent(query)}` : ""}`); }
export function getStudentFees(studentId) { return request(`/students/${studentId}/fees`); }
export function getFeeCollections(academicYear = "") { return request(`/fee-collections${academicYear ? `?academicYear=${encodeURIComponent(academicYear)}` : ""}`); }
export function getFeeReceiptHistory(studentId) { return request(`/fee-collections/students/${encodeURIComponent(studentId)}/history`); }
export function getFeeReceiptOptions(studentId, academicYear) { return request(`/fee-collections/students/${encodeURIComponent(studentId)}/receipt-options?academicYear=${encodeURIComponent(academicYear)}`); }
export function collectFeeReceipt(receipt) { return request("/fee-collections/receipts", { method: "POST", body: JSON.stringify(receipt) }); }
export function recordStudentFeePayment(studentId, feeId, payment) { return request(`/students/${studentId}/fees/${feeId}/payments`, { method: "POST", body: JSON.stringify(payment) }); }
export function getMyStudentFees() { return request("/fees/me"); }
export function getMyStudentFeeStructure() { return request("/fees/me/structure"); }
export function payMyStudentFee(invoiceId, payment) { return request(`/fees/me/${invoiceId}/payments`, { method: "POST", body: JSON.stringify(payment) }); }
export function getTeachers(query = "") { return request(`/teachers${query ? `?q=${encodeURIComponent(query)}` : ""}`); }
export function getTeacherWorkloads(query = "") { return request(`/teacher-workloads${query ? `?q=${encodeURIComponent(query)}` : ""}`); }
export function createTeacherWorkload(workload) { return request("/teacher-workloads", { method: "POST", body: JSON.stringify(workload) }); }
export function createWeeklyTeacherWorkload(workload) { return request("/teacher-workloads/weekly", { method: "POST", body: JSON.stringify({ workload }) }); }
export function updateTeacherWorkload(id, workload) { return request(`/teacher-workloads/${id}`, { method: "PUT", body: JSON.stringify(workload) }); }
export function deleteTeacherWorkload(id) { return request(`/teacher-workloads/${id}`, { method: "DELETE" }); }
export function getClassAssignments() { return request("/class-assignments"); }
export function getAssignmentClasses() { return request("/class-assignments/classes"); }
export function createClassAssignment(assignment) { const form = new FormData(); Object.entries(assignment).forEach(([key, value]) => { if (value !== undefined && value !== null) form.append(key, value); }); return request("/class-assignments", { method: "POST", body: form }); }
export function updateClassAssignmentStatus(id, status) { return request(`/class-assignments/${id}/status`, { method: "POST", body: JSON.stringify({ status }) }); }
export function updateTeacherClassAssignmentStatus(id, studentId, status) { return request(`/class-assignments/${id}/students/${studentId}/teacher-status`, { method: "POST", body: JSON.stringify({ status }) }); }
export function saveClassAssignmentFeedback(id, studentId, feedback) { return request(`/class-assignments/${id}/students/${studentId}/feedback`, { method: "POST", body: JSON.stringify({ feedback }) }); }
export function reviewClassAssignment(id, studentId, feedback = "") { return request(`/class-assignments/${id}/students/${studentId}/review`, { method: "POST", body: JSON.stringify({ feedback }) }); }
export function getClassAssignmentComments(id, studentId) { const query = studentId ? `?studentId=${encodeURIComponent(studentId)}` : ""; return request(`/class-assignments/${id}/comments${query}`); }
export function addClassAssignmentComment(id, body, studentId) { return request(`/class-assignments/${id}/comments`, { method: "POST", body: JSON.stringify({ body, studentId }) }); }
export function downloadClassAssignmentFile(id) { return request(`/class-assignments/${id}/file`, { responseType: "blob" }); }
export function createStudent(student) { return request("/students", { method: "POST", body: JSON.stringify(student) }); }
export function getFacilityProducts() { return request("/admin/facility/products"); }
export function createFacilityProduct(product) { return request("/admin/facility/products", { method: "POST", body: JSON.stringify(product) }); }
export function addFacilityStock(productId, quantity) { return request(`/admin/facility/products/${encodeURIComponent(productId)}/stock`, { method: "POST", body: JSON.stringify({ quantity }) }); }
export function deleteFacilityProduct(productId) { return request(`/admin/facility/products/${encodeURIComponent(productId)}`, { method: "DELETE" }); }
export function getFacilityProductStudents(productId) { return request(`/admin/facility/products/${encodeURIComponent(productId)}/students`); }
export function getFacilityStudentAssets(studentId) { return request(`/admin/facility/students/${encodeURIComponent(studentId)}/assets`); }
export function allocateFacilityAssets(studentId, productIds) { return request(`/admin/facility/students/${encodeURIComponent(studentId)}/allocations`, { method: "POST", body: JSON.stringify({ productIds }) }); }
<<<<<<< HEAD
export function setFacilityStudentPayment(productId, studentId, paid, paidAt = "") { return request(`/admin/facility/products/${encodeURIComponent(productId)}/students/${encodeURIComponent(studentId)}/payment`, { method: "PUT", body: JSON.stringify({ paid, paidAt: paid ? paidAt : null }) }); }
=======
export function setFacilityStudentPayment(productId, studentId, paid) { return request(`/admin/facility/products/${encodeURIComponent(productId)}/students/${encodeURIComponent(studentId)}/payment`, { method: "PUT", body: JSON.stringify({ paid }) }); }
>>>>>>> 1ab38baeb130a8a02d3b672b9f0e39888dab1fc9
export function allocateFacilityProduct(productId, studentId, quantity) { return request(`/admin/facility/products/${encodeURIComponent(productId)}/allocations`, { method: "POST", body: JSON.stringify({ studentId, quantity }) }); }
export function getTransportStudents() { return request("/admin/transport/students"); }
export function createAdmission(student) { return request("/admissions", { method: "POST", body: JSON.stringify(student) }); }
export function getAdmissions() { return request("/admissions"); }
export function createAdmissionEnquiry(enquiry) { return request("/admission-enquiries", { method: "POST", body: JSON.stringify(enquiry) }); }
export function getAdmissionEnquiries() { return request("/admission-enquiries"); }
export function downloadAdmissionTemplate() { return request("/admissions/template", { responseType: "blob" }); }
export function importAdmissions(file) { const form = new FormData(); form.append("file", file); return request("/admissions/import", { method: "POST", body: form }); }
export function getStudentFeeStructures() { return request("/student-fee-structures"); }
export function saveStudentFeeStructure(structure) { return request("/student-fee-structures", { method: "POST", body: JSON.stringify(structure) }); }
export function getTeacherSalaryStructures() { return request("/teacher-salary-structures"); }
export function getPayrollStructures() { return request("/payroll/structures"); }
export function savePayrollStructure(payroll, editing = false) { return request(editing ? `/payroll/structures/${payroll.teacherId}` : "/payroll/structures", { method: editing ? "PUT" : "POST", body: JSON.stringify(payroll) }); }
export function getPayrollEmployees() { return request("/payroll/employees"); }
export function savePayrollEmployee(id, pfNumber) { return request(`/payroll/employees/${id}`, { method: "PUT", body: JSON.stringify({ pfNumber }) }); }
export function getSalarySlips() { return request("/payroll/slips"); }
export function deleteSalarySlip(id) { return request(`/payroll/slips/${encodeURIComponent(id)}`, { method: "DELETE" }); }
export function deleteMonthlySalarySlips(month) { return request(`/payroll/slips?month=${encodeURIComponent(month)}`, { method: "DELETE" }); }
export function generateSalarySlips(month, teacherId = null, paidDays = {}) { return request("/payroll/generate", { method: "POST", body: JSON.stringify({ month, teacherId, paidDays }) }); }
export function saveTeacherSalaryStructure(structure) { return request("/teacher-salary-structures", { method: "POST", body: JSON.stringify(structure) }); }
export function getAttendance(date) { return request(`/attendance${date ? `?date=${date}` : ""}`); }
export function getStudentLeave() { return request("/student-leave"); }
export function applyStudentLeave(entry) { return request("/student-leave", { method: "POST", body: JSON.stringify(entry) }); }
export function decideStudentLeave(id, approve) { return request(`/student-leave/${id}/decision`, { method: "POST", body: JSON.stringify({ approve }) }); }
export function getTeacherLeave() { return request("/teacher-leave"); }
export function applyTeacherLeave(application, proof) {
  const form = new FormData();
  form.append("application", new Blob([JSON.stringify(application)], { type: "application/json" }));
  if (proof) form.append("proof", proof);
  return request("/teacher-leave", { method: "POST", body: form });
}
export function downloadLeaveProof(id) { return request(`/teacher-leave/${id}/proof`, { responseType: "blob" }); }
export function decideTeacherLeave(id, approve) { return request(`/teacher-leave/${id}/decision`, { method: "POST", body: JSON.stringify({ approve }) }); }
export function getTeacherAttendance(from, to) { return request(`/teacher-attendance?from=${from}&to=${to}`); }
export function getAttendanceApprovers() { return request("/teacher-attendance/approvers"); }
export function submitTeacherAttendance(entry) { return request("/teacher-attendance", { method: "POST", body: JSON.stringify(entry) }); }
export function getAttendanceRequests() { return request("/teacher-attendance/requests"); }
export function decideTeacherAttendance(id, approve) { return request(`/teacher-attendance/${id}/decision`, { method: "POST", body: JSON.stringify({ approve }) }); }
export function getMyAttendance(from, to) { return request(`/attendance/me?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`); }
export function saveAttendance(entry) { return request("/attendance", { method: "POST", body: JSON.stringify(entry) }); }
export function getAnnouncements() { return request("/announcements"); }
export function createAnnouncement(announcement) { return request("/announcements", { method: "POST", body: JSON.stringify(announcement) }); }
export function updateAnnouncement(id, announcement) { return request(`/announcements/${id}`, { method: "PUT", body: JSON.stringify(announcement) }); }
export function deleteAnnouncement(id) { return request(`/announcements/${id}`, { method: "DELETE" }); }
export function getNotifications() { return request("/notifications"); }
export function createNotification(notification) { return request("/notifications", { method: "POST", body: JSON.stringify(notification) }); }
export function updateNotification(id, notification) { return request(`/notifications/${id}`, { method: "PUT", body: JSON.stringify(notification) }); }
export function deleteNotification(id) { return request(`/notifications/${id}`, { method: "DELETE" }); }
export function getHolidays() { return request("/holidays"); }
export function createHoliday(holiday) { return request("/holidays", { method: "POST", body: JSON.stringify(holiday) }); }
export function importHolidayList(file) { const form = new FormData(); form.append("file", file); return request("/holidays/import", { method: "POST", body: form }); }
export function deleteHoliday(id) { return request(`/holidays/${id}`, { method: "DELETE" }); }

export function getPayrollDays(month) { return request(`/payroll/days?month=${encodeURIComponent(month)}`); }
export function downloadSyllabusTemplate() { return request('/syllabuses/excel/template', { responseType: 'blob' }); }
export function previewSyllabusExcel(file, period = 'FULL_YEAR') { const body = new FormData(); body.append('file', file); return request(`/syllabuses/excel/preview-term?period=${encodeURIComponent(period)}`, { method: 'POST', body }); }
export function getTeacherPerformance() { return request('/teacher-performance'); }
export function getPerformanceRules() { return request('/teacher-performance/rules'); }
export function savePerformanceRules(entry) { return request('/teacher-performance/rules', { method: 'PUT', body: JSON.stringify(entry) }); }
export function savePerformanceRemarks(teacher, entry) { return request(`/teacher-performance/remarks/${encodeURIComponent(teacher)}`, { method: 'PUT', body: JSON.stringify(entry) }); }
export function assignSyllabusTeacher(id, teacherUserId) { return request(`/syllabuses/${id}/teacher`, { method: 'PUT', body: JSON.stringify({ teacherUserId }) }); }
export function addSyllabusTopic(id, topic) { return request(`/syllabuses/${id}/topics`, { method: 'POST', body: JSON.stringify(topic) }); }
export function uploadSyllabusPdf(id, file) { const body = new FormData(); body.append('file', file); return request(`/syllabuses/${id}/file`, { method: 'PUT', body }); }
export function confirmSyllabusExcel(id) { return request(`/syllabuses/excel/${id}/confirm`, { method: 'POST' }); }

export function setSyllabusTopicStatus(id,status) { return request(`/syllabuses/topics/${id}/status`, {method:'PUT',body:JSON.stringify({status})}); }

export function deleteSyllabusTopic(id) { return request(`/syllabuses/topics/${id}`, { method: "DELETE" }); }

export function getAvailableAdjustmentTeachers(workloadId) { return request(`/teacher-adjustments/available-teachers?workloadId=${encodeURIComponent(workloadId)}`); }
