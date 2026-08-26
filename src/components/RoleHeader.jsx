export default function RoleHeader({ role }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ width: 44, height: 44, borderRadius: 22, background: '#eef2ff', display: 'grid', placeItems: 'center' }}>{role?.charAt(0)?.toUpperCase()}</div>
      <div>
        <strong>{role}</strong>
      </div>
    </div>
  )
}
