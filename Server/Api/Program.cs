using Microsoft.Extensions.FileProviders;
using Server.Api.Extensions;
using Server.Api.Middlewares;
using Server.Data.Seeders;
using Server.Gateway;
using Server.Shared.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services
    .AddGateway(builder.Configuration)
    .AddData(builder.Configuration)
    .AddModules()
    .AddApiControllers();

var app = builder.Build();

await app.SeedDataAsync();

// Nhật ký đặt ngoài cùng để ghi được kết quả cuối (kể cả lỗi đã đổi thành response ở middleware dưới)
app.UseMiddleware<AuditLogMiddleware>();
app.UseMiddleware<ExceptionHandlingMiddleware>();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

// File tải lên (ảnh đại diện…): phục vụ tĩnh, không cần đăng nhập
var uploadsPath = FileStorageService.GetRootPath(app.Configuration);
Directory.CreateDirectory(uploadsPath);
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(uploadsPath),
    RequestPath = FileStorageService.PublicPath,
});

app.UseGateway();

app.MapControllers();

app.Run();
