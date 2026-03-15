import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export const size = { width: 512, height: 512 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'white',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg viewBox="0 0 32 32" width="384" height="384" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path 
            d="M 11 7 L 27 7 L 23 13 L 21 13 L 17 19 L 25 19 L 21 25 L 5 25 L 9 19 L 11 19 L 15 13 L 7 13 Z" 
            fill="#3b82f6" 
            stroke="#3b82f6" 
            strokeWidth="1.5" 
            strokeLinejoin="round" 
          />
        </svg>
      </div>
    ),
    { ...size }
  )
}
