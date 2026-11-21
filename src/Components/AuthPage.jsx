import { useState } from "react";
import { Eye, EyeOff, GraduationCap, LockKeyhole, Mail, UserRound } from "lucide-react";
import { registerAccount, signIn } from "../lib/api";

function AuthPage({ onAuthenticated }) {
  const [mode, setMode] = useState("login");
  const [showPassword, setShowPassword] = useState(false);
  const [registrationScope, setRegistrationScope] = useState("ADMIN");
  const [form, setForm] = useState({ name: "", email: "", userId: "", password: "", role: "ADMIN", className: "", section: "", rollNumber: "", teacherId: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const update = (event) => setForm({ ...form, [event.target.name]: event.target.value });
  const changeMode = (nextMode) => { setMode(nextMode); setError(""); setNotice(""); };
  const changeRegistrationScope = (scope) => {
    setRegistrationScope(scope);
    setForm(current => ({ ...current, role: scope === "ADMIN" ? "ADMIN" : scope }));
  };
  const visibleRoles = registrationScope === "ADMIN" ? ["SUPER_ADMIN", "ADMIN", "TEACHER", "STUDENT"] : registrationScope === "TEACHER" ? ["TEACHER", "STUDENT"] : registrationScope === "SUB_ADMIN" ? ["SUB_ADMIN"] : ["STUDENT"];

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (mode === "register") {
        const result = await registerAccount({ displayName: form.name, email: form.email, password: form.password, role: form.role, className: form.className, sectionName: form.section, rollNumber: form.rollNumber, teacherId: form.teacherId, registrationType: form.role === "TEACHER" ? "OLD" : undefined });
        const generatedUserId = result.userId || result.userCode;
        if (!generatedUserId) throw new Error("The backend is running an old authentication build. Restart the backend and try again.");
        if (form.role === "TEACHER" && !result.registrationType) throw new Error("The server did not save the registration type. Restart the backend so the latest update can be used.");
        setForm({ ...form, userId: generatedUserId });
        setMode("login");
        setNotice(`Account created successfully. Your user ID is ${generatedUserId}. Use it to sign in.`);
        return;
      }
      const session = await signIn(form.userId, form.password, form.role);
      onAuthenticated(session);
    } catch (requestError) {
      setError(requestError.message || "Unable to connect to the school server.");
    } finally {
      setBusy(false);
    }
  };

  return <div className="auth-screen">
    <div className="auth-brand"><div className="brand-mark"><GraduationCap size={21} /></div><div><strong>edura</strong><span>school OS</span></div></div>
    <section className="auth-card">
      <div className="auth-heading"><p className="eyebrow">School management platform</p><h1>{mode === "login" ? "Welcome back" : "Create your account"}</h1><p>{mode === "login" ? "Sign in to continue to your school portal." : "Set up your account to access the school portal."}</p></div>
      <div className="auth-tabs"><button className={mode === "login" ? "selected" : ""} onClick={() => changeMode("login")}>Login</button><button className={mode === "register" ? "selected" : ""} onClick={() => changeMode("register")}>Register</button></div>
      <form onSubmit={submit} autoComplete="off">
        {mode === "register" && form.role === "STUDENT" && <p className="auth-hint">Student accounts are created by the school in Student Admission.</p>}
        {mode === "register" && <label><span>Full name</span><div className="auth-input"><UserRound size={16}/><input name="name" value={form.name} onChange={update} placeholder="Your name" required /></div></label>}
        {mode === "register" ? <label><span>Email address</span><div className="auth-input"><Mail size={16}/><input name="email" type="email" autoComplete="off" value={form.email} onChange={update} placeholder="you@school.edu" required /></div></label> : <label><span>User ID or email</span><div className="auth-input"><UserRound size={16}/><input name="userId" autoComplete="username" autoCorrect="off" spellCheck="false" value={form.userId} onChange={update} placeholder="AD123456 / SA123456 / TH123456 / ST123456 / you@school.edu" required /></div></label>}
        <label><span>Password</span><div className="auth-input"><LockKeyhole size={16}/><input name="password" type={showPassword ? "text" : "password"} value={form.password} onChange={update} placeholder="Enter your password" minLength={6} required /><button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={16}/> : <Eye size={16}/>}</button></div></label>
        {mode === "register" && <div className="registration-scope"><span>Registration access</span><div>{[["ADMIN", "Administrator"], ["SUB_ADMIN", "SubAdmin"], ["TEACHER", "Teacher"], ["STUDENT", "Student"]].map(([scope, label]) => <button type="button" key={scope} className={registrationScope === scope ? "selected" : ""} onClick={() => changeRegistrationScope(scope)}>{label}</button>)}</div></div>}
        {mode === "register" && <label><span>Account role</span><select name="role" value={form.role} onChange={update}>{visibleRoles.map(role => <option value={role} key={role}>{role === "SUPER_ADMIN" ? "Super administrator" : role === "ADMIN" ? "Administrator" : role === "SUB_ADMIN" ? "SubAdmin" : role === "TEACHER" ? "Teacher" : "Student"}</option>)}</select></label>}
        {mode === "register" && form.role === "TEACHER" && <label><span>Teacher ID</span><input name="teacherId" value={form.teacherId} onChange={update} placeholder="Enter teacher ID" required /></label>}
        {mode === "register" && form.role === "STUDENT" && <div className="student-registration-fields"><label><span>Class</span><select name="className" value={form.className} onChange={update} required><option value="">Select class</option>{Array.from({ length: 10 }, (_, index) => `Class ${index + 1}`).map(item => <option key={item}>{item}</option>)}</select></label><label><span>Section</span><select name="section" value={form.section} onChange={update} required><option value="">Select section</option>{["A", "B", "C"].map(item => <option key={item}>{item}</option>)}</select></label><label><span>Roll number</span><input name="rollNumber" value={form.rollNumber} onChange={update} placeholder="Enter roll number" required /></label></div>}
        {notice && <p className="auth-success">{notice}</p>}
        {error && <p className="auth-error">{error}</p>}
        <button className="auth-submit" disabled={busy}>{busy ? "Please wait..." : mode === "login" ? "Sign in" : "Create account"}</button>
      </form>
      <p className="auth-hint">New here? Register first. Your user ID is generated automatically and you can also sign in with your email.</p>
      <p className="auth-hint">Your user ID is generated automatically when you register.</p>

    </section>
  </div>;
}

export default AuthPage;
