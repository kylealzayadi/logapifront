import { useEffect, useMemo, useState } from 'react'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

const STATUS_CLASS_MAP = {
  Delivered: 'badge-delivered',
  Shipped: 'badge-shipped',
  Processing: 'badge-processing',
  Pending: 'badge-pending',
  Cancelled: 'badge-cancelled',
}

function formatDate(dateValue) {
  if (!dateValue) {
    return 'N/A'
  }

  const parsed = new Date(dateValue)
  if (Number.isNaN(parsed.getTime())) {
    return 'N/A'
  }

  return parsed.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function formatCurrency(amount) {
  const value = Number(amount)
  if (Number.isNaN(value)) {
    return '$0.00'
  }

  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
  }).format(value)
}

function getSearchableOrderKey(order) {
  const orderNumber = order.orderNumber ?? order.id
  return `${order.customerName ?? ''} ${order.status ?? ''} ${orderNumber ?? ''}`.toLowerCase()
}

function App() {
  const [orders, setOrders] = useState([])
  const [search, setSearch] = useState('')
  const [selectedOrderId, setSelectedOrderId] = useState(null)
  const [selectedOrderDetails, setSelectedOrderDetails] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingDetails, setIsLoadingDetails] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function fetchOrders() {
      setIsLoading(true)
      setError('')

      try {
        const response = await fetch(`${API_BASE_URL}/orders`)
        if (!response.ok) {
          throw new Error(`Orders request failed with ${response.status}`)
        }

        const data = await response.json()
        setOrders(Array.isArray(data) ? data : [])
      } catch (requestError) {
        setError('Unable to load orders right now. Please try again.')
        setOrders([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchOrders()
  }, [])

  useEffect(() => {
    async function fetchOrderDetails(orderId) {
      if (orderId == null) {
        setSelectedOrderDetails(null)
        return
      }

      setIsLoadingDetails(true)

      try {
        const response = await fetch(`${API_BASE_URL}/orders/${orderId}`)
        if (!response.ok) {
          throw new Error(`Order details request failed with ${response.status}`)
        }

        const data = await response.json()
        setSelectedOrderDetails(data)
      } catch (requestError) {
        setSelectedOrderDetails(null)
      } finally {
        setIsLoadingDetails(false)
      }
    }

    fetchOrderDetails(selectedOrderId)
  }, [selectedOrderId])

  const filteredOrders = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()

    if (!normalizedSearch) {
      return orders
    }

    return orders.filter((order) => getSearchableOrderKey(order).includes(normalizedSearch))
  }, [orders, search])

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">Logistics Dashboard</p>
          <h1>Order Search</h1>
        </div>
        <p className="subtitle">Search by customer name, order number, or status.</p>
      </header>

      <section className="toolbar">
        <label htmlFor="order-search" className="search-label">
          Search Orders
        </label>
        <input
          id="order-search"
          type="search"
          className="search-input"
          placeholder="Try: John, 1001, Shipped"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </section>

      {isLoading && <p className="state-text">Loading orders...</p>}
      {!isLoading && error && <p className="state-text error-text">{error}</p>}
      {!isLoading && !error && filteredOrders.length === 0 && (
        <p className="state-text">No orders match your search.</p>
      )}

      {!isLoading && !error && filteredOrders.length > 0 && (
        <section className="orders-layout" aria-label="Orders list">
          <div className="table-wrap">
            <table className="orders-table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Customer</th>
                  <th>Order Date</th>
                  <th>Status</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => {
                  const isSelected = selectedOrderId === order.id
                  const statusClass = STATUS_CLASS_MAP[order.status] ?? 'badge-pending'

                  return (
                    <tr
                      key={order.id}
                      className={isSelected ? 'selected-row' : ''}
                      onClick={() => setSelectedOrderId(order.id)}
                    >
                      <td>#{order.orderNumber ?? order.id}</td>
                      <td>{order.customerName ?? 'N/A'}</td>
                      <td>{formatDate(order.orderDate)}</td>
                      <td>
                        <span className={`status-badge ${statusClass}`}>{order.status ?? 'Unknown'}</span>
                      </td>
                      <td>{formatCurrency(order.totalAmount)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            <div className="cards-view">
              {filteredOrders.map((order) => {
                const isSelected = selectedOrderId === order.id
                const statusClass = STATUS_CLASS_MAP[order.status] ?? 'badge-pending'

                return (
                  <article
                    key={order.id}
                    className={`order-card ${isSelected ? 'selected-card' : ''}`}
                    onClick={() => setSelectedOrderId(order.id)}
                  >
                    <div className="card-row">
                      <span className="card-label">Order ID</span>
                      <span>#{order.orderNumber ?? order.id}</span>
                    </div>
                    <div className="card-row">
                      <span className="card-label">Customer</span>
                      <span>{order.customerName ?? 'N/A'}</span>
                    </div>
                    <div className="card-row">
                      <span className="card-label">Date</span>
                      <span>{formatDate(order.orderDate)}</span>
                    </div>
                    <div className="card-row">
                      <span className="card-label">Status</span>
                      <span className={`status-badge ${statusClass}`}>{order.status ?? 'Unknown'}</span>
                    </div>
                    <div className="card-row">
                      <span className="card-label">Total</span>
                      <span>{formatCurrency(order.totalAmount)}</span>
                    </div>
                  </article>
                )
              })}
            </div>
          </div>

          <aside className="details-panel" aria-label="Selected order details">
            {!selectedOrderId && <p>Select an order to view full details.</p>}
            {selectedOrderId && isLoadingDetails && <p>Loading order details...</p>}
            {selectedOrderId && !isLoadingDetails && !selectedOrderDetails && (
              <p>Unable to load order details for this order.</p>
            )}
            {selectedOrderDetails && !isLoadingDetails && (
              <div>
                <h2>Order #{selectedOrderDetails.orderNumber ?? selectedOrderDetails.id}</h2>
                <p>
                  <strong>Customer:</strong> {selectedOrderDetails.customerName ?? 'N/A'}
                </p>
                <p>
                  <strong>Email:</strong> {selectedOrderDetails.customerEmail ?? 'N/A'}
                </p>
                <p>
                  <strong>Date:</strong> {formatDate(selectedOrderDetails.orderDate)}
                </p>
                <p>
                  <strong>Status:</strong>{' '}
                  <span
                    className={`status-badge ${STATUS_CLASS_MAP[selectedOrderDetails.status] ?? 'badge-pending'}`}
                  >
                    {selectedOrderDetails.status ?? 'Unknown'}
                  </span>
                </p>
                <p>
                  <strong>Total:</strong> {formatCurrency(selectedOrderDetails.totalAmount)}
                </p>

                <h3>Items</h3>
                {Array.isArray(selectedOrderDetails.items) && selectedOrderDetails.items.length > 0 ? (
                  <ul className="items-list">
                    {selectedOrderDetails.items.map((item, index) => (
                      <li key={item.id ?? `${item.name}-${index}`}>
                        {item.name ?? 'Item'} x {item.quantity ?? 0}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>No item details available.</p>
                )}
              </div>
            )}
          </aside>
        </section>
      )}
    </main>
  )
}

export default App
