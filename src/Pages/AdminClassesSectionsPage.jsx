import { useEffect, useState } from "react";
import { createClass, createSection, getClasses, getSections } from "../lib/api";
import "./AdminClassesSectionsPage.css";

const byName = (a, b) => a.name.localeCompare(b.name, undefined, { numeric: true });

export default function AdminClassesSectionsPage({ mode }) {
  const isSections = mode === "Sections";
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [name, setName] = useState("");
  const [classId, setClassId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function load() {
    const [classRows, sectionRows] = await Promise.all([getClasses(), getSections()]);
    setClasses(classRows.sort(byName));
    setSections(sectionRows.sort((a, b) => a.class_name.localeCompare(b.class_name, undefined, { numeric: true }) || byName(a, b)));
  }

  useEffect(() => {
    let live = true;
    Promise.all([getClasses(), getSections()]).then(([classRows, sectionRows]) => {
      if (!live) return;
      setClasses(classRows.sort(byName));
      setSections(sectionRows.sort((a, b) => a.class_name.localeCompare(b.class_name, undefined, { numeric: true }) || byName(a, b)));
    }).catch((err) => { if (live) setError(err.message); }).finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, []);

  async function save(event) {
    event.preventDefault();
    setError(""); setSuccess(""); setSaving(true);
    try {
      if (isSections) await createSection({ classId, name: name.trim() });
      else await createClass({ name: name.trim() });
      setName("");
      setSuccess(`${isSections ? "Section" : "Class"} saved successfully.`);
      await load();
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  }

  const rows = isSections ? sections : classes;
  return <section className="class-section-page">
    <div><h1>{isSections ? "Sections" : "Classes"}</h1><p>Set up {isSections ? "sections for each class" : "school classes"} and view active student registrations.</p></div>
    <div className="class-section-summary"><span><strong>{classes.length}</strong> Active classes</span><span><strong>{sections.length}</strong> Active sections</span><span><strong>{classes.reduce((sum, row) => sum + Number(row.student_count), 0)}</strong> Registered students</span></div>
    {error && <p className="class-section-error" role="alert">{error}</p>}
    {success && <p className="class-section-success" role="status">{success}</p>}
    <form className="class-section-form" onSubmit={save}>
      <h2>{isSections ? "Set section" : "Set class"}</h2>
      {isSections && <label>Class<select required value={classId} onChange={(event) => setClassId(event.target.value)} disabled={loading || saving}><option value="">Select class</option>{classes.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</select></label>}
      <label>{isSections ? "Section name" : "Class name"}<input required maxLength={isSections ? 30 : 80} placeholder={isSections ? "e.g. A" : "e.g. 10"} value={name} onChange={(event) => setName(event.target.value)} disabled={saving}/></label>
      <button type="submit" disabled={loading || saving || !name.trim() || (isSections && !classId)}>{saving ? "Saving..." : isSections ? "Save section" : "Save class"}</button>
      {isSections && !loading && !classes.length && <p>Create a class in the Classes menu first.</p>}
    </form>
    <div className="class-section-list"><h2>All active {isSections ? "sections" : "classes"}</h2>
      {loading ? <p role="status">Loading...</p> : <table><thead><tr>{isSections && <th>Class</th>}<th>{isSections ? "Section" : "Class"}</th>{!isSections && <th>Sections</th>}<th>Registered students</th><th>Status</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id}>{isSections && <td>{row.class_name}</td>}<td>{row.name}</td>{!isSections && <td>{row.section_count}</td>}<td>{row.student_count}</td><td><span className="class-section-status">Active</span></td></tr>)}{!rows.length && <tr><td colSpan="4">No active {isSections ? "sections" : "classes"} yet.</td></tr>}</tbody></table>}
    </div>
  </section>;
}
