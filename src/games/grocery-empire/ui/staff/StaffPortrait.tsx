import type { RoleId } from '../../content/staff'
import { SHIRT } from './shirts'


/** A small portrait: shirt colour plus one prop that says the job. */
export function RolePortrait({ role }: { role: RoleId }) {
  return (
    <svg className="sf-portrait" viewBox="0 0 48 48" aria-hidden>
      <rect width="48" height="48" rx="6" fill="#1c1916" />
      <path d="M12 40 Q24 28 36 40 V44 H12 Z" fill={SHIRT[role]} />
      <circle cx="24" cy="18" r="8" fill="#e6c2a0" />
      {role === 'security' ? <rect x="16" y="10" width="16" height="4" rx="1" fill="#1a1c1e" /> : null}
      {role === 'clerk' ? <rect x="14" y="30" width="20" height="6" fill="#6c5b47" /> : null}
      {role === 'stocker' ? <rect x="30" y="26" width="8" height="10" fill="#7cc47f" /> : null}
      {role === 'cashier' ? <rect x="10" y="28" width="12" height="8" fill="#efe9dc" /> : null}
      {role === 'night' ? <circle cx="36" cy="12" r="3" fill="#ffd98c" /> : null}
      {role === 'handler' ? <path d="M15 18 A9 9 0 0 1 33 18" fill="none" stroke="#1a1c1e" strokeWidth="2.4" /> : null}
      {role === 'diplomat' ? <rect x="22" y="30" width="4" height="10" fill="#9b3f3a" /> : null}
      {role === 'taster' ? <circle cx="37" cy="30" r="4" fill="#efe9dc" /> : null}
      {role === 'surveyor' ? <circle cx="36" cy="12" r="4" fill="none" stroke="#d7c4a1" strokeWidth="1.6" /> : null}
      {role === 'grower' ? <path d="M36 14 q-5 -2 -5 -7 q5 0 5 7" fill="#6fbf73" /> : null}
      {role === 'greeter' ? <path d="M36 30 l4 -8 l2 1 l-3 8 Z" fill="#e6c2a0" /> : null}
      {role === 'buyer' ? <rect x="30" y="27" width="9" height="12" rx="1" fill="#efe9dc" stroke="#6c5b47" strokeWidth="1" /> : null}
      {role === 'communityRep' ? <path d="M24 36 l-4 -4 a2.3 2.3 0 0 1 4 -3 a2.3 2.3 0 0 1 4 3 Z" fill="#ffd0d6" /> : null}
      {role === 'trainer' ? <circle cx="20" cy="33" r="2.4" fill="#cfd6dc" /> : null}
      {role === 'bookkeeper' ? <path d="M18 18 h5 M25 18 h5" stroke="#1a1c1e" strokeWidth="2" /> : null}
      {role === 'paralegal' ? <rect x="10" y="29" width="11" height="9" rx="1" fill="#d9c08a" /> : null}
      {role === 'hrManager' ? <rect x="27" y="31" width="7" height="5" rx="1" fill="#efe9dc" /> : null}
      {role === 'spokesperson' ? <rect x="34" y="20" width="4" height="10" rx="2" fill="#1a1c1e" /> : null}
      {role === 'franchiseScout' ? <path d="M17 17 h14" stroke="#1a1c1e" strokeWidth="3" /> : null}
    </svg>
  )
}
