// File input with the current image, its preview and a "remove" tick. Uploads go to Cloudinary on save.
export default function ImageField({ name, removeName, current, label, hint = 'JPG, PNG or WebP · max 4 MB', contain, onFile }) {
  return (
    <>
      {current && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={current} alt="" className={`adm-cover-preview${contain ? ' adm-cover-preview--contain' : ''}`} />
      )}
      <input id={name} name={name} type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" className="input admin-file" aria-label={label}
        onChange={onFile && ((e) => e.target.files?.[0] && onFile(e.target.files[0]))} />
      <span className="admin-hint">{hint}</span>
      {current && <label className="admin-check"><input type="checkbox" name={removeName} /> Remove current {label.toLowerCase()}</label>}
    </>
  );
}
