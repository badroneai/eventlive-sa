import assert from 'node:assert/strict';
import { isPlaceholderCity, normalizeSaudiCity } from './city-utils.mjs';

assert.equal(normalizeSaudiCity('Jiddah Superdome'), 'Jeddah');
assert.equal(normalizeSaudiCity('مركز الرياض الدولي للمؤتمرات'), 'Riyadh');
assert.equal(normalizeSaudiCity('King Abdulaziz Center for World Culture Ithra'), 'Dhahran');
assert.equal(normalizeSaudiCity('Al-Hofuf stadium'), 'Al Ahsa');
assert.equal(normalizeSaudiCity('Abha Chamber'), 'Abha');
assert.equal(normalizeSaudiCity('غرفة أبها'), 'Abha');
assert.equal(normalizeSaudiCity('Aseer Season'), 'Aseer');
assert.equal(normalizeSaudiCity('عن بعد'), 'Online');
assert.equal(normalizeSaudiCity('JAX District Diriyah'), 'Diriyah');
assert.equal(normalizeSaudiCity('مركز الملك عبد الله الحضاري بالجبيل'), 'Jubail');
assert.equal(normalizeSaudiCity('Nationwide Saudi program'), 'Nationwide');
assert.equal(normalizeSaudiCity('Paris, France'), 'Global');
assert.equal(isPlaceholderCity('Saudi Arabia'), true);
assert.equal(isPlaceholderCity('Riyadh'), false);

console.log('city-regression-test: ok');
