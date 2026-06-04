# Shared Hosting Setup Guide (Hostinger, Namecheap, etc.)

This project has been configured to work on **shared hosting** where symbolic links (`symlink()`) are disabled.

## Why We Changed the Storage Configuration

By default, Laravel saves public files in `storage/app/public/` and requires a symbolic link (`public/storage`) created via:

```bash
php artisan storage:link
```

On Hostinger and many shared hosts, this command fails because `symlink()` is disabled.

## Solution Applied

We modified `config/filesystems.php` so that the `public` disk writes files **directly inside the `public/` folder**:

```php
'public' => [
    'driver' => 'local',
    'root' => public_path('storage'),   // ← Changed
    'url' => env('APP_URL').'/storage',
    'visibility' => 'public',
],
```

This means:
- Uploaded files will be saved to: `public/storage/product-images/`
- They are directly accessible via: `https://yourdomain.com/storage/product-images/xxx.jpg`
- **No symbolic link is required**

---

## Steps to Set Up on Hostinger

### 1. Upload Your Project

Upload your Laravel project to Hostinger (usually inside `public_html` or a subfolder).

### 2. Create Required Folders

Using **Hostinger File Manager**, create this folder structure:

```
public_html/
├── public/
│   └── storage/
│       └── product-images/          ← This folder will hold uploaded medicine images
│
└── storage/
    └── app/
        └── public/                  ← You can leave this empty or delete it
```

> **Tip:** You can create these folders manually in the File Manager.

### 3. Set Correct Permissions (Important)

Set the following permissions via File Manager:

- `storage/` → `755`
- `public/storage/` → `755`
- `public/storage/product-images/` → `755`

### 4. Update `.env` File

Make sure your `.env` has these values:

```env
APP_URL=https://yourdomain.com          # or https://yourdomain.com/subfolder
FILESYSTEM_DISK=public
```

### 5. Clear Laravel Cache

After uploading, run these commands via **SSH** (if available) or manually delete the files:

```bash
php artisan config:clear
php artisan cache:clear
php artisan route:clear
```

If you don't have SSH access, simply delete the contents of these folders:

- `bootstrap/cache/*.php`
- `storage/framework/cache/data/*`
- `storage/framework/views/*`

### 6. Test File Upload

Try uploading a product image from the admin panel.

The image should appear in:

```
public/storage/product-images/
```

And should be visible in the frontend.

---

## Moving Existing Images (If Any)

If you already have images in `storage/app/public/product-images/`, you need to move them to the new location:

**Old location:**
```
storage/app/public/product-images/
```

**New location:**
```
public/storage/product-images/
```

You can do this via File Manager or FTP.

---

## Summary of Changes Made to the Project

| File                              | Change                                      |
|-----------------------------------|---------------------------------------------|
| `config/filesystems.php`          | Changed `public` disk root to `public_path('storage')` |
| `config/filesystems.php`          | Commented out the `links` array             |
| `app/Http/Controllers/ProductController.php` | Already uses `Storage::disk('public')` |
| Frontend (`storageUrl()`)         | Already generates correct `/storage/...` paths |

No code changes are needed in controllers or frontend.

---

## Common Issues & Fixes

| Problem                        | Solution |
|--------------------------------|----------|
| Images not showing             | Check that `public/storage/product-images/` folder exists and has correct permissions (755) |
| New uploads not appearing      | Clear config cache: `php artisan config:clear` |
| 404 on image URLs              | Make sure `APP_URL` in `.env` is correct |
| Permission denied errors       | Set folder permissions to 755 via File Manager |

---

**Last Updated:** June 2026

This setup is the standard approach used by most Laravel developers on shared hosting.