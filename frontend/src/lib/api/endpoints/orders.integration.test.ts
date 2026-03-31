import assert from 'node:assert/strict'
import { ordersApiPaths } from './orders'

function runIntegrationTests() {
  assert.equal(ordersApiPaths.list(''), '/orders?')
  assert.equal(ordersApiPaths.list('page=2&pageSize=20'), '/orders?page=2&pageSize=20')
  assert.equal(ordersApiPaths.getOne('order-1'), '/orders/order-1')
}

runIntegrationTests()
console.log('orders endpoint integration tests passed')
