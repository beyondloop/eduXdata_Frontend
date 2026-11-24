import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Backpack, BookOpen, Check, CreditCard, Package, Plus, Search, Shirt, X } from "lucide-react";
import { addFacilityStock, allocateFacilityAssets, createFacilityProduct, deleteFacilityProduct, getFacilityProductStudents, getFacilityProducts, getFacilityStudentAssets, setFacilityStudentPayment } from "../lib/api";

const productIcon = (category) => category === "BAG" ? Backpack : category === "UNIFORM" ? Shirt : category === "ID_CARD" ? CreditCard : category === "BOOK" ? BookOpen : Package;
const categoryLabel = (category) => ({ BAG: "Bag", UNIFORM: "Dress / uniform", ID_CARD: "Identity card", BOOK: "Book", OTHER: "Other" })[category] || category;
const facilityCategories = [
  { value: "BAG", label: "Bag", icon: Backpack },
  { value: "UNIFORM", label: "Dress", icon: Shirt },
  { value: "ID_CARD", label: "Identity card", icon: CreditCard },
  { value: "BOOK", label: "Book", icon: BookOpen },
];

export default function FacilityPage({ inventoryOnly = false, canDelete = false }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [form, setForm] = useState({ name: "", category: "BAG", size: "", quantity: "" });
  const [stockDrafts, setStockDrafts] = useState({});

  useEffect(() => {
    let live = true;
    getFacilityProducts().then((rows) => {
      if (live) {
        setProducts(rows);
        setError("");
      }
    }).catch((failure) => { if (live) setError(failure.message); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [revision]);

  const categoryProducts = useMemo(() => selectedCategory ? products.filter((product) => product.category === selectedCategory) : [], [products, selectedCategory]);
  const categoryTotals = useMemo(() => Object.fromEntries(facilityCategories.map(({ value }) => {
    const items = products.filter((product) => product.category === value);
    return [value, items.reduce((totals, product) => ({
      remaining: totals.remaining + Number(product.available_quantity || 0),
      distributed: totals.distributed + Number(product.allocated_quantity || 0),
    }), { remaining: 0, distributed: 0 })];
  })), [products]);
  const selectedProduct = categoryProducts.find((product) => product.id === selectedProductId) || categoryProducts[0];
  useEffect(() => {
    if (selectedCategory && categoryProducts.length && !categoryProducts.some((product) => product.id === selectedProductId))
      setSelectedProductId(categoryProducts[0].id);
  }, [categoryProducts, selectedCategory, selectedProductId]);

  const run = async (action) => {
    setBusy(true); setError("");
    try { await action(); setRevision((value) => value + 1); }
    catch (failure) { setError(failure.message || "Unable to save facility inventory."); }
    finally { setBusy(false); }
  };
  const submitProduct = (event) => {
    event.preventDefault();
    run(async () => { await createFacilityProduct({ ...form, quantity: Number(form.quantity) }); setForm({ name: "", category: "BAG", size: "", quantity: "" }); });
  };
  const restock = (product) => {
    const quantity = Number(stockDrafts[product.id]);
    if (!Number.isInteger(quantity) || quantity < 1) { setError("Enter a positive quantity to add to stock."); return; }
    run(async () => { await addFacilityStock(product.id, quantity); setStockDrafts((current) => ({ ...current, [product.id]: "" })); });
  };
  const deleteProduct = (product) => run(() => deleteFacilityProduct(product.id));

  return <div className="module-page facility-page">
    <header className="module-title"><div className="module-icon"><Package size={24}/></div><div><p className="eyebrow">School supplies</p><h1>{inventoryOnly ? "Facility Inventory" : "Facility Distribution"}</h1><p className="subtle">{inventoryOnly ? "Set product stock and sizes." : "Choose a facility item category to issue products to students."}</p></div></header>
    {error && <p className="auth-error" role="alert">{error}</p>}

    {inventoryOnly ? <>
      <section className="panel facility-create-panel"><div><p className="eyebrow">INVENTORY SETUP</p><h2>Add a product and starting quantity</h2><p>Use a separate size for each uniform or other size-based item.</p></div><form onSubmit={submitProduct} className="facility-product-form"><label>Product name<input required maxLength={160} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="e.g. School bag" /></label><label>Type<select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}><option value="BAG">Bag</option><option value="UNIFORM">Dress / uniform</option><option value="ID_CARD">Identity card</option><option value="BOOK">Book</option><option value="OTHER">Other</option></select></label><label>Size<input maxLength={40} value={form.size} onChange={(event) => setForm({ ...form, size: event.target.value })} placeholder="Optional, e.g. 30 or Large" /></label><label>Starting stock<input required type="number" min="0" step="1" value={form.quantity} onChange={(event) => setForm({ ...form, quantity: event.target.value })} /></label><button className="primary-btn" disabled={busy}><Plus size={15}/> Add to inventory</button></form></section>
      <section className="facility-products-section"><div className="panel-head"><div><h2>Product inventory</h2><p>Available stock is updated after each completed allocation.</p></div></div>
        {loading ? <p className="facility-empty">Loading facility inventory…</p> : products.length === 0 ? <div className="facility-empty panel">No inventory added yet.</div> : <div className="facility-product-grid">{products.map((product) => { const Icon = productIcon(product.category); return <article className="facility-product-card panel" key={product.id}>{canDelete && <button type="button" className="facility-delete-product" title="Remove inventory item" aria-label={`Delete ${product.name} from inventory`} disabled={busy} onClick={() => deleteProduct(product)}><X size={15}/></button>}<span className="facility-product-icon"><Icon size={24}/></span><div className="facility-product-info"><span>{categoryLabel(product.category)}{product.size ? ` · Size ${product.size}` : ""}</span><h3>{product.name}</h3><p><b>{product.available_quantity}</b> units remaining</p></div><div className="facility-restock"><input aria-label={`Quantity to add for ${product.name}`} type="number" min="1" step="1" placeholder="Qty" value={stockDrafts[product.id] || ""} onChange={(event) => setStockDrafts((current) => ({ ...current, [product.id]: event.target.value }))}/><button type="button" className="filter-btn" disabled={busy} onClick={() => restock(product)}>Add stock</button></div></article>; })}</div>}
      </section>
    </> : selectedCategory ? <section className="facility-allocation-page">
      <button type="button" className="facility-back-button" onClick={() => { setSelectedCategory(null); setSelectedProductId(""); }}><ArrowLeft size={16}/> All categories</button>
      <div className="facility-allocation-heading"><span>{(() => { const Icon = facilityCategories.find((category) => category.value === selectedCategory)?.icon || Package; return <Icon size={22}/>; })()}</span><div><p className="eyebrow">STUDENT ALLOCATION</p><h2>{facilityCategories.find((category) => category.value === selectedCategory)?.label} distribution</h2><p>Set payment status and allocate this item to students.</p></div></div>
      {categoryProducts.length > 1 && <label className="facility-product-chooser"><span>Product / size</span><select value={selectedProduct?.id || ""} onChange={(event) => setSelectedProductId(event.target.value)}>{categoryProducts.map((product) => <option key={product.id} value={product.id}>{product.name}{product.size ? ` · Size ${product.size}` : ""} · ${product.available_quantity} in stock</option>)}</select></label>}
      {loading ? <p className="facility-empty">Loading inventory…</p> : !selectedProduct ? <div className="facility-empty panel">No {facilityCategories.find((category) => category.value === selectedCategory)?.label.toLowerCase()} items are in inventory. Add products from Inventory.</div> : <AllocationStudentsPage key={selectedProduct.id} product={selectedProduct} onChanged={() => setRevision((value) => value + 1)} />}
    </section> : <section className="facility-category-grid" aria-label="Facility categories">{facilityCategories.map(({ value, label, icon: Icon }) => <button type="button" key={value} className="facility-category-card" onClick={() => { setSelectedCategory(value); setSelectedProductId(""); }}><span><Icon size={22}/></span><b>{label}</b><small>Left quantity: <strong>{categoryTotals[value]?.remaining || 0}</strong></small><small>Distributed quantity: <strong>{categoryTotals[value]?.distributed || 0}</strong></small></button>)}</section>}
  </div>;
}

function AllocationStudentsPage({ product, onChanged }) {
  const [students, setStudents] = useState([]);
  const [query, setQuery] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [sectionFilter, setSectionFilter] = useState("");
  const [busyStudent, setBusyStudent] = useState("");
  const [issueStudent, setIssueStudent] = useState(null);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let live = true;
    getFacilityProductStudents(product.id).then((rows) => { if (live) setStudents(rows); }).catch((failure) => { if (live) setError(failure.message); });
    return () => { live = false; };
  }, [product.id, revision]);
  const classes = useMemo(() => [...new Set(students.map((student) => student.class_name).filter(Boolean))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true })), [students]);
  const sections = useMemo(() => [...new Set(students.filter((student) => !classFilter || student.class_name === classFilter).map((student) => student.section_name).filter(Boolean))].sort(), [classFilter, students]);
  const visibleStudents = useMemo(() => students.filter((student) => [student.display_name, student.user_id, student.roll_number, student.parent_contact_number].join(" ").toLowerCase().includes(query.trim().toLowerCase()) && (!classFilter || student.class_name === classFilter) && (!sectionFilter || student.section_name === sectionFilter)), [classFilter, query, sectionFilter, students]);
  const Icon = productIcon(product.category);
  const updatePayment = async (student) => {
    setBusyStudent(student.id); setError("");
<<<<<<< HEAD
    const isMarkingPaid = !student.paid;
    try { await setFacilityStudentPayment(product.id, student.id, isMarkingPaid, isMarkingPaid ? new Date().toISOString() : ""); setRevision((value) => value + 1); onChanged(); }
=======
    try { await setFacilityStudentPayment(product.id, student.id, !student.paid); setRevision((value) => value + 1); onChanged(); }
>>>>>>> 1ab38baeb130a8a02d3b672b9f0e39888dab1fc9
    catch (failure) { setError(failure.message || "Unable to update payment status."); }
    finally { setBusyStudent(""); }
  };
  return <section className="facility-students-page">
    <header><span className="facility-product-icon"><Icon size={22}/></span><div><p className="eyebrow">{categoryLabel(product.category).toUpperCase()}</p><h3>{product.name}{product.size ? ` · Size ${product.size}` : ""}</h3><small>{product.available_quantity} units remaining</small></div></header>
    {error && <p className="auth-error" role="alert">{error}</p>}
    <div className="facility-student-filters"><label className="facility-student-search"><Search size={16}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find by student, roll number, or phone" /></label><select value={classFilter} onChange={(event) => { setClassFilter(event.target.value); setSectionFilter(""); }}><option value="">All classes</option>{classes.map((className) => <option key={className}>{className}</option>)}</select><select value={sectionFilter} onChange={(event) => setSectionFilter(event.target.value)}><option value="">All sections</option>{sections.map((section) => <option key={section}>{section}</option>)}</select></div>
    <div className="facility-student-list"><table><thead><tr><th>Student</th><th>Class / section</th><th>Roll number</th><th>Phone</th><th>Payment done</th><th>Allocated</th><th></th></tr></thead><tbody>{visibleStudents.map((student) => { const allocated = student.allocated === true || Number(student.allocated_quantity) > 0; const canAllocate = student.paid && !allocated && Number(product.available_quantity) > 0; const statusClass = allocated ? "allocated" : !student.paid ? "unpaid" : ""; return <tr key={student.id}><td><b>{student.display_name}</b><small>{student.user_id}</small></td><td>{student.class_name || "—"}{student.section_name ? ` · ${student.section_name}` : ""}</td><td>{student.roll_number || "—"}</td><td>{student.parent_contact_number || "—"}</td><td><button type="button" className={`facility-payment-pill ${student.paid ? "paid" : "unpaid"}`} disabled={busyStudent === student.id || allocated} title={allocated ? "Item already allocated" : "Click to update payment status"} onClick={() => updatePayment(student)}>{student.paid ? <><Check size={12}/> Yes</> : "No · mark paid"}</button></td><td><span className={`facility-allocated-status ${allocated ? "yes" : "no"}`}>{allocated ? "Yes" : "No"}</span></td><td><button type="button" className={`primary-btn facility-allocate-button ${statusClass}`} disabled={!canAllocate} onClick={() => setIssueStudent(student)}>{allocated ? "Allocated" : student.paid ? "Allocate" : "Unpaid"}</button></td></tr>; })}{!visibleStudents.length && <tr><td colSpan="7" className="facility-no-students">No students match these filters.</td></tr>}</tbody></table></div>
<<<<<<< HEAD
    <footer><span>Only paid, unallocated items can be issued. Payment date and time are recorded when a payment is marked paid.</span></footer>
=======
    <footer><span>Only paid, unallocated items can be issued.</span></footer>
>>>>>>> 1ab38baeb130a8a02d3b672b9f0e39888dab1fc9
    {issueStudent && <AssetIssueModal student={issueStudent} selectedProduct={product} onClose={() => setIssueStudent(null)} onComplete={() => { setIssueStudent(null); setRevision((value) => value + 1); onChanged(); }} />}
  </section>;
}

function AssetIssueModal({ student, selectedProduct, onClose, onComplete }) {
  const [assets, setAssets] = useState([]);
  const [selected, setSelected] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let live = true;
    getFacilityStudentAssets(student.id).then((rows) => {
      if (live) {
        setAssets(rows);
        const initial = rows.find((asset) => asset.id === selectedProduct.id && asset.paid && !asset.allocated && Number(asset.available_quantity) > 0);
        setSelected(initial ? [initial.id] : []);
      }
    }).catch((failure) => { if (live) setError(failure.message); }).finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [selectedProduct.id, student.id]);
  const eligible = assets.filter((asset) => asset.paid && !asset.allocated && Number(asset.available_quantity) > 0);
  const allSelected = eligible.length > 0 && eligible.every((asset) => selected.includes(asset.id));
  const toggle = (id) => setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  const toggleAll = () => setSelected(allSelected ? [] : eligible.map((asset) => asset.id));
  const submit = async () => {
    if (!selected.length) { setError("Select at least one paid item to allocate."); return; }
    setBusy(true); setError("");
    try { await allocateFacilityAssets(student.id, selected); onComplete(); }
    catch (failure) { setError(failure.message || "Unable to complete this allocation."); }
    finally { setBusy(false); }
  };
  return <div className="facility-modal-backdrop facility-asset-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="facility-asset-modal" role="dialog" aria-modal="true" aria-labelledby="facility-asset-title">
    <header><span className="facility-product-icon"><Package size={23}/></span><div><p className="eyebrow">ISSUE FACILITY ASSETS</p><h2 id="facility-asset-title">{student.display_name}</h2><small>Roll number: {student.roll_number || "—"} · {student.class_name || "—"}{student.section_name ? ` · ${student.section_name}` : ""}</small></div><button type="button" className="facility-modal-close" onClick={onClose} aria-label="Close asset allocation"><X size={18}/></button></header>
    {error && <p className="auth-error" role="alert">{error}</p>}
    {eligible.length > 1 && <label className="facility-select-all"><input type="checkbox" checked={allSelected} onChange={toggleAll}/> Select all paid items in stock</label>}
    <div className="facility-asset-list">{loading ? <p className="facility-empty">Loading available assets…</p> : assets.map((asset) => { const Icon = productIcon(asset.category); const canSelect = asset.paid && !asset.allocated && Number(asset.available_quantity) > 0; return <label className={`facility-asset-option ${canSelect ? "eligible" : "unavailable"}`} key={asset.id}><input type="checkbox" checked={selected.includes(asset.id)} disabled={!canSelect || busy} onChange={() => toggle(asset.id)}/><span className="facility-asset-icon"><Icon size={19}/></span><span className="facility-asset-name"><b>{asset.name}{asset.size ? ` · ${asset.size}` : ""}</b><small>{categoryLabel(asset.category)} · {asset.allocated ? "Already allocated" : asset.paid ? `${asset.available_quantity} in stock` : "Payment not done"}</small></span><span className={`facility-allocated-status ${asset.allocated ? "yes" : "no"}`}>{asset.allocated ? "Allocated" : asset.paid ? "Paid" : "Unpaid"}</span></label>; })}{!loading && !assets.length && <p className="facility-empty">No facility products are configured.</p>}</div>
    <footer><span>{selected.length} item{selected.length === 1 ? "" : "s"} selected</span><div><button type="button" className="filter-btn" disabled={busy} onClick={onClose}>Cancel</button><button type="button" className="primary-btn" disabled={busy || loading || !selected.length} onClick={submit}>{busy ? "Saving…" : "Done · Issue selected"}</button></div></footer>
  </section></div>;
}
