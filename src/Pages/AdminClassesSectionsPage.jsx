import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { createClass, createSection, deleteClass, getClasses, getSections } from "../lib/api";
import "./AdminClassesSectionsPage.css";

const byName = (a, b) => a.name.localeCompare(b.name, undefined, { numeric: true });
const standardClassNames = ["Nursery", "LKG", "UKG", ...Array.from({ length: 10 }, (_, index) => `Class ${index + 1}`)];
const ALL_CLASSES_OPTION = "__ALL_CLASSES__";

export default function AdminClassesSectionsPage({ mode, canEdit = true }) {
  const isSections = mode === "Sections";
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [name, setName] = useState("");
  const [selectedClassName, setSelectedClassName] = useState("");
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

  const rows = isSections ? sections : classes;
  const activeClassNames = new Set(classes.map((row) => row.name.trim().toLowerCase()));
  const inactiveStandardClasses = standardClassNames.filter((className) => !activeClassNames.has(className.toLowerCase()));
  const sectionClassOptions = [...standardClassNames, ...classes.map((row) => row.name).filter((className) => !standardClassNames.includes(className))];

  async function save(event) {
    event.preventDefault();
    setError(""); setSuccess(""); setSaving(true);
    try {
      if (isSections) {
        let classRow = classes.find((row) => row.name === selectedClassName);
        if (!classRow) {
          await createClass({ name: selectedClassName });
          const refreshedClasses = await getClasses();
          classRow = refreshedClasses.find((row) => row.name === selectedClassName);
        }
        if (!classRow) throw new Error("The class could not be created. Please try again.");
        await createSection({ classId: classRow.id, name: name.trim() });
        setName("");
        setSuccess("Section saved successfully.");
      } else if (name === ALL_CLASSES_OPTION) {
        if (!inactiveStandardClasses.length) return;
        const results = await Promise.allSettled(inactiveStandardClasses.map((className) => createClass({ name: className })));
        const succeededCount = results.filter((result) => result.status === "fulfilled").length;
        const firstFailure = results.find((result) => result.status === "rejected");
        if (succeededCount) {
          setName("");
          setSuccess(firstFailure ? `${succeededCount} classes activated.` : "All classes activated successfully.");
        }
        if (firstFailure) setError(firstFailure.reason?.message || "Unable to activate some classes.");
      } else {
        await createClass({ name: name.trim() });
        setName("");
        setSuccess("Class saved successfully.");
      }
      await load();
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  }

  async function removeClass(row) {
    if (!canEdit || !window.confirm(`Delete ${row.name}? This cannot be undone.`)) return;
    setError(""); setSuccess(""); setSaving(true);
    try { await deleteClass(row.id); setSuccess(`${row.name} deleted successfully.`); await load(); }
    catch (err) { setError(err.message || "Unable to delete this class."); }
    finally { setSaving(false); }
  }

  return <section className="class-section-page">
    <div><h1>{isSections ? "Sections" : "Classes"}</h1><p>Set up {isSections ? "sections for each class" : "school classes"} and view active student registrations.</p></div>
    <div className="class-section-summary"><span><strong>{classes.length}</strong> Active classes</span><span><strong>{sections.length}</strong> Active sections</span><span><strong>{classes.reduce((sum, row) => sum + Number(row.student_count), 0)}</strong> Registered students</span></div>
    {error && <p className="class-section-error" role="alert">{error}</p>}
    {success && <p className="class-section-success" role="status">{success}</p>}
    <form className="class-section-form" onSubmit={save}>
      <h2>{isSections ? "Set section" : "Set class"}</h2>
      {isSections ? <>
        <label>Class<select required value={selectedClassName} onChange={(event) => setSelectedClassName(event.target.value)} disabled={loading || saving || !canEdit}><option value="">Select class</option>{sectionClassOptions.map((className) => <option key={className} value={className}>{className}</option>)}</select><small>Selecting a listed class creates it automatically if needed.</small></label>
        <label>Section name<input required maxLength={30} placeholder="e.g. A" value={name} onChange={(event) => setName(event.target.value)} disabled={loading || saving || !canEdit}/></label>
      </> : <label>Class name<select required value={name} onChange={(event) => setName(event.target.value)} disabled={loading || saving || !canEdit}><option value="">Select class</option><option value={ALL_CLASSES_OPTION} disabled={!inactiveStandardClasses.length}>{inactiveStandardClasses.length ? "Active all classes" : "Active all classes (All active)"}</option>{standardClassNames.map((className) => { const active = activeClassNames.has(className.toLowerCase()); return <option key={className} value={className} disabled={active}>{active ? `${className} (Active)` : className}</option>; })}</select></label>}
      {canEdit && <button type="submit" disabled={loading || saving || !name.trim() || (isSections && !selectedClassName)}>{saving ? (name === ALL_CLASSES_OPTION ? "Activating..." : "Saving...") : isSections ? "Save section" : "Save class"}</button>}
      {isSections && !loading && !classes.length && <p>Create a class in the Classes menu first.</p>}
    </form>
    <div className="class-section-list"><h2>All active {isSections ? "sections" : "classes"}</h2>
      {loading ? <p role="status">Loading...</p> : <table><thead><tr>{isSections && <th>Class</th>}<th>{isSections ? "Section" : "Class"}</th>{!isSections && <th>Sections</th>}<th>Registered students</th><th>Status</th>{!isSections && canEdit && <th aria-label="Actions"/>}</tr></thead><tbody>{rows.map((row) => <tr key={row.id}>{isSections && <td>{row.class_name}</td>}<td>{row.name}</td>{!isSections && <td>{row.section_count}</td>}<td>{row.student_count}</td><td><span className="class-section-status">Active</span></td>{!isSections && canEdit && <td><button type="button" className="class-delete" aria-label={`Delete ${row.name}`} title={`Delete ${row.name}`} onClick={() => removeClass(row)} disabled={saving}><X size={16}/></button></td>}</tr>)}{!rows.length && <tr><td colSpan={isSections || !canEdit ? 4 : 5}>No active {isSections ? "sections" : "classes"} yet.</td></tr>}</tbody></table>}
    </div>
  </section>;
}
