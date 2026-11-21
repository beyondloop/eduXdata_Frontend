import test from 'node:test';
import assert from 'node:assert/strict';
import { filterSyllabusPlans, syllabusSectionOptions } from './syllabusFilters.js';
const plans = [
 {id:1,class_name:'Class 1',section_name:' A ',period:'TERM_1'},
 {id:2,class_name:'1',section_name:'B',period:'TERM_1'},
 {id:3,class_name:'1',section_name:'A',period:'TERM_2'},
 {id:4,class_name:'2',section_name:'A',period:'TERM_1'},
 {id:5,class_name:'1',section_name:'A',period:null},
];
test('class, section and term filters intersect and normalize stored names',()=>{
 assert.deepEqual(filterSyllabusPlans(plans,{className:'1',section:'a',term:'Term 1'}).map(p=>p.id),[1]);
 assert.deepEqual(filterSyllabusPlans(plans,{className:'Class 1',section:'A',term:'TERM_2'}).map(p=>p.id),[3]);
 assert.deepEqual(filterSyllabusPlans(plans,{className:'1',section:'A',term:'FULL_YEAR'}).map(p=>p.id),[5]);
 assert.deepEqual(filterSyllabusPlans(plans,{className:'2',section:'B',term:'TERM_1'}),[]);
 assert.equal(filterSyllabusPlans(plans).length,5);
});
test('section options follow selected class and remove duplicate section names',()=>{
 assert.deepEqual(syllabusSectionOptions(plans,'1'),['A','B']);
 assert.deepEqual(syllabusSectionOptions(plans,'2'),['A']);
});
