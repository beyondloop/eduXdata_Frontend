export const classKey = value => String(value ?? '').trim().replace(/^class\s*/i, '').trim().toLowerCase();
export const sectionKey = value => String(value ?? '').trim().toLowerCase();
export const termKey = value => String(value || 'FULL_YEAR').trim().toUpperCase().replace(/[\s-]+/g, '_').replace(/^TERM([12])$/, 'TERM_$1');
export function filterSyllabusPlans(plans, {className = '', section = '', term = ''} = {}) {
  return plans.filter(plan => (!className || classKey(plan.class_name) === classKey(className))
    && (!section || sectionKey(plan.section_name) === sectionKey(section))
    && (!term || termKey(plan.period) === termKey(term)));
}
export function syllabusSectionOptions(plans, className = '') {
  const sections = new Map();
  for (const plan of filterSyllabusPlans(plans, {className})) {
    const name = String(plan.section_name ?? '').trim();
    if (name) sections.set(sectionKey(name), name);
  }
  return [...sections.values()].sort((a,b) => a.localeCompare(b, undefined, {numeric:true}));
}
