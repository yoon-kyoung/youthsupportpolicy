import { categoryMeta } from './codes'
import { C } from '../styles/colors'
import Icon from '../styles/Icon'

export default function PolicyCardMini({ policy }) {
  const cat = categoryMeta(policy.category)
  const link = policy.applyUrl || policy.refUrl

  return (
    <article style={{
      background:C.neutralWhite,border:`1.5px solid #f1f5f9`,borderRadius:16,padding:16,
      animation:'fadeUp 0.25s ease',
    }}>
      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8,flexWrap:'wrap'}}>
        <span style={{
          background:`${cat.color}15`,color:cat.color,fontSize:12,fontWeight:700,
          padding:'3px 10px',borderRadius:99,whiteSpace:'nowrap',
          display:'inline-flex',alignItems:'center',gap:4,
        }}>
          <Icon name={cat.icon} size={13} color={cat.color}/>{policy.subCategory||cat.key}
        </span>
        {policy.regionSpecific?(
          <span style={{fontSize:12,color:C.primary,fontWeight:600,display:'inline-flex',alignItems:'center',gap:3}}><Icon name="location_on" size={13} color={C.primary}/>{policy.regions[0]} 맞춤</span>
        ):(
          <span style={{fontSize:12,color:C.mutedText}}>전국</span>
        )}
      </div>

      <h3 style={{margin:'0 0 6px',fontSize:15,fontWeight:700,color:C.neutralDark,lineHeight:1.4}}>
        {policy.name}
      </h3>
      {policy.summary&&(
        <p style={{margin:'0 0 8px',fontSize:13,color:C.mutedText,lineHeight:1.5}}>
          {policy.summary}
        </p>
      )}

      <dl style={{margin:0,fontSize:13,color:C.mutedText,lineHeight:1.6}}>
        {policy.support&&(
          <div><dt style={{display:'inline',fontWeight:600}}>지원내용</dt>{' '}
          <dd style={{display:'inline',margin:0}}>{policy.support}</dd></div>
        )}
        <div>
          <dt style={{display:'inline',fontWeight:600}}>지원연령</dt>{' '}
          <dd style={{display:'inline',margin:0}}>
            {policy.minAge!=null&&policy.maxAge!=null
              ?`만 ${policy.minAge}~${policy.maxAge}세`
              :'연령 무관'}
          </dd>
        </div>
        {policy.period&&(
          <div><dt style={{display:'inline',fontWeight:600}}>신청기간</dt>{' '}
          <dd style={{display:'inline',margin:0}}>{policy.period}</dd></div>
        )}
        {policy.org&&(
          <div><dt style={{display:'inline',fontWeight:600}}>주관</dt>{' '}
          <dd style={{display:'inline',margin:0}}>{policy.org}</dd></div>
        )}
      </dl>

      {link&&(
        <a
          href={link} target="_blank" rel="noopener noreferrer"
          style={{
            display:'inline-block',marginTop:10,fontSize:13,fontWeight:700,
            color:C.primary,textDecoration:'none',
          }}
        >
          신청·자세히 보기 →
        </a>
      )}
    </article>
  )
}
