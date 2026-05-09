import { BIRTHPLACES } from '../data/birthplaces.mjs'

const normalize = (value) => String(value || '')
  .trim()
  .toLowerCase()
  .replace(/[\s'’`·.-]/g, '')

const searchableText = (place) => [
  place.name,
  place.admin1,
  place.country,
  ...(place.aliases || [])
].map(normalize).filter(Boolean)

const index = BIRTHPLACES.map((place) => ({
  ...place,
  label: `${place.name} · ${place.admin1} · ${place.country}`,
  searchTokens: searchableText(place)
}))

const scorePlace = (place, query) => {
  if (!query) return Math.log10((place.population || 0) + 10)
  let score = 0
  place.searchTokens.forEach((token) => {
    if (token === query) score = Math.max(score, 120)
    else if (token.startsWith(query)) score = Math.max(score, 90 - token.length / 10)
    else if (token.includes(query)) score = Math.max(score, 55 - token.indexOf(query))
  })
  if (!score) return 0
  return score + Math.log10((place.population || 0) + 10)
}

export const findBirthplaceByName = (name) => {
  const query = normalize(name)
  if (!query) return null
  return index.find((place) => place.searchTokens.some((token) => token === query)) || null
}

export const searchBirthplaces = (query, limit = 8) => {
  const normalizedQuery = normalize(query)
  return index
    .map((place) => ({ ...place, score: scorePlace(place, normalizedQuery) }))
    .filter((place) => place.score > 0)
    .sort((a, b) => b.score - a.score || (b.population || 0) - (a.population || 0))
    .slice(0, limit)
}

const sortByPopulation = (items) => [...items].sort((a, b) => (b.population || 0) - (a.population || 0) || a.name.localeCompare(b.name, 'zh-Hans-CN'))

export const getBirthplaceCountries = () => {
  const countries = [...new Set(index.map((place) => place.country).filter(Boolean))]
  return countries.sort((a, b) => {
    if (a === '中国') return -1
    if (b === '中国') return 1
    return a.localeCompare(b, 'zh-Hans-CN')
  })
}

export const getBirthplaceAdminOptions = (country) => {
  if (!country) return []
  const options = [...new Set(index
    .filter((place) => place.country === country)
    .map((place) => place.admin1)
    .filter(Boolean))]
  return options.sort((a, b) => a.localeCompare(b, 'zh-Hans-CN'))
}

export const getBirthplaceCityOptions = (country, admin1) => {
  if (!country || !admin1) return []
  return sortByPopulation(index.filter((place) => place.country === country && place.admin1 === admin1))
}

export const findBirthplaceByRegion = ({ country, admin1, city }) => {
  if (!country || !admin1 || !city) return null
  return index.find((place) => place.country === country && place.admin1 === admin1 && place.name === city) || null
}
