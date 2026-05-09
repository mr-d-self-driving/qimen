import test from 'node:test'
import assert from 'node:assert/strict'

import {
  findBirthplaceByName,
  findBirthplaceByRegion,
  getBirthplaceAdminOptions,
  getBirthplaceCityOptions,
  getBirthplaceCountries,
  searchBirthplaces
} from './birthplaceSearch.mjs'

test('searchBirthplaces finds Chinese city names and aliases', () => {
  const chinese = searchBirthplaces('成都')
  assert.equal(chinese[0].name, '成都')
  assert.equal(chinese[0].lng, 104.0668)

  const english = searchBirthplaces('chengdu')
  assert.equal(english[0].name, '成都')
})

test('searchBirthplaces prioritizes exact and prefix matches', () => {
  const results = searchBirthplaces('西')
  assert.ok(results.some((place) => place.name === '西安'))
  assert.ok(results.some((place) => place.name === '西宁'))
})

test('findBirthplaceByName resolves aliases', () => {
  assert.equal(findBirthplaceByName('NYC')?.name, '纽约')
  assert.equal(findBirthplaceByName('北京市')?.lng, 116.4074)
})

test('birthplace region helpers expose country admin city hierarchy', () => {
  assert.equal(getBirthplaceCountries()[0], '中国')
  assert.ok(getBirthplaceAdminOptions('中国').includes('四川'))
  assert.equal(getBirthplaceCityOptions('中国', '四川')[0].name, '成都')
  assert.equal(findBirthplaceByRegion({ country: '中国', admin1: '四川', city: '成都' })?.lng, 104.0668)
})
