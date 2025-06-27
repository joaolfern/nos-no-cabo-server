import unittest
from app import app, db, Project

class ProjectApiTestCase(unittest.TestCase):
    def setUp(self):
        self.app = app.test_client()
        app.config['TESTING'] = True
        app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
        with app.app_context():
            db.create_all()

    def tearDown(self):
        with app.app_context():
            db.session.remove()
            db.drop_all()

    def test_create_project(self):
        response = self.app.post('/project', json={"name": "Meu Projeto", "url": "http://meuprojeto.com"})
        self.assertEqual(response.status_code, 200)
        self.assertIn("Project created successfully", response.get_data(as_text=True))

    def test_create_project_invalid(self):
        response = self.app.post('/project', json={"name": "", "url": ""})
        self.assertEqual(response.status_code, 400)

    def test_get_projects(self):
        # Add a project first
        with app.app_context():
            db.session.add(Project(name="Teste", url="http://teste.com"))
            db.session.commit()
        response = self.app.get('/project')
        self.assertEqual(response.status_code, 200)
        self.assertIn("Teste", response.get_data(as_text=True))

    def test_update_project(self):
        with app.app_context():
            project = Project(name="Old", url="http://old.com")
            db.session.add(project)
            db.session.commit()
            pid = project.id
        response = self.app.patch(f'/project/{pid}', json={"name": "Novo", "url": "http://novo.com"})
        self.assertEqual(response.status_code, 200)
        self.assertIn("Project updated successfully", response.get_data(as_text=True))

    def test_delete_project(self):
        with app.app_context():
            project = Project(name="Del", url="http://del.com")
            db.session.add(project)
            db.session.commit()
            pid = project.id
        response = self.app.delete(f'/project/{pid}')
        self.assertEqual(response.status_code, 200)
        self.assertIn("Project deleted successfully", response.get_data(as_text=True))

if __name__ == '__main__':
    unittest.main()
